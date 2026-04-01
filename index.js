const fs = require('fs');
const path = require('path');
const http = require('http');
const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const dataDir = path.join(__dirname, 'data');
const configPath = path.join(dataDir, 'configs.json');
const ticketPath = path.join(dataDir, 'tickets.json');
const transcriptDir = path.join(__dirname, 'transcripts');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(transcriptDir)) fs.mkdirSync(transcriptDir, { recursive: true });
if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(ticketPath)) fs.writeFileSync(ticketPath, JSON.stringify({}, null, 2));

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getAllConfigs() {
  return readJson(configPath);
}

function getConfig(guildId) {
  const configs = getAllConfigs();
  if (!configs[guildId]) {
    configs[guildId] = {
      panelChannelId: null,
      logChannelId: null,
      ticketCategoryId: null,
      staffRoleId: null,
      ticketNameFormat: 'ticket-{user}-{number}',
      panel: {
        title: 'Apri un ticket',
        description: 'Premi il pulsante qui sotto per aprire un ticket con lo staff.',
        color: '#5865F2',
        buttonLabel: 'Apri Ticket',
        buttonEmoji: '🎫',
        footer: 'Supporto server',
      },
      ticket: {
        welcomeMessage: 'Ciao {user}, descrivi qui il tuo problema. Uno staffer ti risponderà presto.',
        claimMessage: '✅ Ticket preso in carico da {staff}',
        closeMessage: '🔒 Il ticket verrà chiuso tra 5 secondi...',
      },
      counters: {
        lastTicketNumber: 0,
      },
    };
    writeJson(configPath, configs);
  }
  return configs[guildId];
}

function setConfig(guildId, newConfig) {
  const configs = getAllConfigs();
  configs[guildId] = newConfig;
  writeJson(configPath, configs);
}

function getTickets() {
  return readJson(ticketPath);
}

function setTickets(tickets) {
  writeJson(ticketPath, tickets);
}

function formatText(text, vars = {}) {
  return String(text)
    .replaceAll('{user}', vars.user || '')
    .replaceAll('{staff}', vars.staff || '')
    .replaceAll('{ticket}', vars.ticket || '')
    .replaceAll('{number}', vars.number || '');
}

function sanitizeChannelName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
}

function buildPanelEmbed(config, guild) {
  return new EmbedBuilder()
    .setTitle(config.panel.title)
    .setDescription(config.panel.description)
    .setColor(config.panel.color || '#5865F2')
    .setFooter({ text: config.panel.footer || guild.name });
}

function buildPanelButtons(config) {
  const button = new ButtonBuilder()
    .setCustomId('ticket_open')
    .setLabel(config.panel.buttonLabel || 'Apri Ticket')
    .setStyle(ButtonStyle.Primary);

  if (config.panel.buttonEmoji) button.setEmoji(config.panel.buttonEmoji);

  return new ActionRowBuilder().addComponents(button);
}

function buildTicketButtons(claimedBy = null) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel(claimedBy ? `Preso da ${claimedBy}` : 'Prendi in carico')
      .setStyle(ButtonStyle.Success)
      .setDisabled(Boolean(claimedBy)),
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Chiudi Ticket')
      .setStyle(ButtonStyle.Danger)
  );
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('ticket-panel')
      .setDescription('Invia il pannello dei ticket nel canale configurato')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('ticket-settings')
      .setDescription('Configura canali, categoria, staff e nome ticket')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand(sub =>
        sub
          .setName('canali')
          .setDescription('Imposta canale pannello, canale log e categoria ticket')
          .addChannelOption(opt =>
            opt.setName('canale_pannello').setDescription('Canale dove far spawnare il pannello').addChannelTypes(ChannelType.GuildText)
          )
          .addChannelOption(opt =>
            opt.setName('canale_log').setDescription('Canale dove mandare i log').addChannelTypes(ChannelType.GuildText)
          )
          .addChannelOption(opt =>
            opt.setName('categoria_ticket').setDescription('Categoria in cui creare i ticket').addChannelTypes(ChannelType.GuildCategory)
          )
      )
      .addSubcommand(sub =>
        sub
          .setName('staff')
          .setDescription('Imposta il ruolo staff')
          .addRoleOption(opt => opt.setName('ruolo').setDescription('Ruolo staff').setRequired(true))
      )
      .addSubcommand(sub =>
        sub
          .setName('nome-ticket')
          .setDescription('Imposta il formato del nome ticket')
          .addStringOption(opt =>
            opt.setName('formato').setDescription('Esempio: ticket-{user}-{number}').setRequired(true)
          )
      )
      .addSubcommand(sub => sub.setName('mostra').setDescription('Mostra la configurazione attuale')),

    new SlashCommandBuilder()
      .setName('ticket-grafica')
      .setDescription('Configura grafica e bottone del pannello')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand(sub => sub.setName('testi').setDescription('Apri il modal per titolo, descrizione e footer'))
      .addSubcommand(sub =>
        sub
          .setName('bottone')
          .setDescription('Configura testo ed emoji del bottone')
          .addStringOption(opt => opt.setName('testo').setDescription('Testo bottone').setRequired(true))
          .addStringOption(opt => opt.setName('emoji').setDescription('Emoji bottone'))
      )
      .addSubcommand(sub =>
        sub
          .setName('colore')
          .setDescription('Configura il colore embed')
          .addStringOption(opt => opt.setName('hex').setDescription('Esempio: #5865F2').setRequired(true))
      ),

    new SlashCommandBuilder()
      .setName('ticket-messaggi')
      .setDescription('Configura i messaggi del ticket')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand(sub =>
        sub
          .setName('benvenuto')
          .setDescription('Messaggio iniziale nel ticket')
          .addStringOption(opt => opt.setName('testo').setDescription('Usa {user}, {ticket}, {number}').setRequired(true))
      )
      .addSubcommand(sub =>
        sub
          .setName('presa-carico')
          .setDescription('Messaggio quando lo staff prende il ticket')
          .addStringOption(opt => opt.setName('testo').setDescription('Usa {staff}').setRequired(true))
      )
      .addSubcommand(sub =>
        sub
          .setName('chiusura')
          .setDescription('Messaggio di chiusura ticket')
          .addStringOption(opt => opt.setName('testo').setDescription('Testo di chiusura').setRequired(true))
      ),

    new SlashCommandBuilder()
      .setName('ticket-log')
      .setDescription('Imposta rapidamente il canale log')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand(sub =>
        sub
          .setName('canale')
          .setDescription('Imposta il canale log')
          .addChannelOption(opt =>
            opt.setName('canale').setDescription('Canale log').addChannelTypes(ChannelType.GuildText).setRequired(true)
          )
      ),

    new SlashCommandBuilder()
      .setName('ticket-add')
      .setDescription('Aggiunge un utente al ticket corrente')
      .addUserOption(opt => opt.setName('utente').setDescription('Utente da aggiungere').setRequired(true)),

    new SlashCommandBuilder()
      .setName('ticket-remove')
      .setDescription('Rimuove un utente dal ticket corrente')
      .addUserOption(opt => opt.setName('utente').setDescription('Utente da rimuovere').setRequired(true)),

    new SlashCommandBuilder()
      .setName('ticket-close')
      .setDescription('Chiude il ticket corrente'),
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
  console.log('Slash commands registrati con successo.');
}

async function sendOpenLog(guild, config, channel, user, ticketNumber) {
  if (!config.logChannelId) return;
  const logChannel = guild.channels.cache.get(config.logChannelId);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setTitle('📥 Ticket aperto')
    .setColor('Green')
    .addFields(
      { name: 'Utente', value: `${user.tag} (${user.id})`, inline: false },
      { name: 'Canale', value: `${channel}`, inline: true },
      { name: 'Ticket', value: `#${ticketNumber}`, inline: true }
    )
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch(() => null);
}

async function sendClaimLog(guild, config, channel, user) {
  if (!config.logChannelId) return;
  const logChannel = guild.channels.cache.get(config.logChannelId);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setTitle('🛠️ Ticket preso in carico')
    .setColor('Orange')
    .addFields(
      { name: 'Staff', value: `${user.tag} (${user.id})`, inline: false },
      { name: 'Canale', value: `${channel}`, inline: false }
    )
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch(() => null);
}

async function createTranscript(channel) {
  const fetched = await channel.messages.fetch({ limit: 100 });
  const ordered = [...fetched.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  let content = `Transcript ticket: ${channel.name}\n`;
  content += `Esportato il: ${new Date().toLocaleString('it-IT')}\n`;
  content += '==================================================\n\n';

  for (const msg of ordered) {
    const time = new Date(msg.createdTimestamp).toLocaleString('it-IT');
    const plainContent = msg.content?.trim() ? msg.content : '[messaggio senza testo / embed / allegato]';
    const attachments = msg.attachments.size
      ? `\n  Allegati: ${msg.attachments.map(a => a.url).join(', ')}`
      : '';

    content += `[${time}] ${msg.author.tag}: ${plainContent}${attachments}\n`;
  }

  const fileName = `${channel.name}-${Date.now()}.txt`;
  const filePath = path.join(transcriptDir, fileName);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

async function closeTicket(interaction, channel, closedBy, ticketData) {
  const config = getConfig(interaction.guild.id);
  const tickets = getTickets();

  await interaction.reply({
    content: config.ticket.closeMessage || '🔒 Il ticket verrà chiuso tra 5 secondi...',
    ephemeral: false,
  });

  const transcriptPath = await createTranscript(channel);
  const owner = await client.users.fetch(ticketData.ownerId).catch(() => null);

  if (config.logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('📁 Ticket chiuso')
        .setColor('Red')
        .addFields(
          { name: 'Ticket', value: `#${ticketData.ticketNumber || 'N/D'}`, inline: true },
          { name: 'Chiuso da', value: `${closedBy.tag} (${closedBy.id})`, inline: true },
          { name: 'Utente', value: owner ? `${owner.tag} (${owner.id})` : ticketData.ownerId, inline: false },
          { name: 'Canale', value: channel.name, inline: false }
        )
        .setTimestamp();

      await logChannel.send({
        embeds: [embed],
        files: [transcriptPath],
      }).catch(() => null);
    }
  }

  tickets[channel.id] = {
    ...ticketData,
    closed: true,
    closedAt: Date.now(),
    closedBy: closedBy.id,
  };
  setTickets(tickets);

  setTimeout(async () => {
    await channel.delete().catch(() => null);
    const updatedTickets = getTickets();
    delete updatedTickets[channel.id];
    setTickets(updatedTickets);
  }, 5000);
}

client.once(Events.ClientReady, async () => {
  console.log(`Bot online come ${client.user.tag}`);
  await registerCommands();
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const guildId = interaction.guild.id;
      const config = getConfig(guildId);

      if (interaction.commandName === 'ticket-panel') {
        const panelChannel = interaction.channel;

        if (!panelChannel || !panelChannel.isTextBased() || panelChannel.isDMBased()) {
          return interaction.reply({
            content: '❌ Usa questo comando in un canale testuale del server.',
            ephemeral: true,
          });
        }

        config.panelChannelId = panelChannel.id;
        setConfig(guildId, config);

        await panelChannel.send({
          embeds: [buildPanelEmbed(config, interaction.guild)],
          components: [buildPanelButtons(config)],
        });

        return interaction.reply({
          content: `✅ Pannello ticket inviato in ${panelChannel}. Questo canale è stato salvato anche come canale pannello.`,
          ephemeral: true,
        });
      }

      if (interaction.commandName === 'ticket-settings') {
        const sub = interaction.options.getSubcommand();

        if (sub === 'canali') {
          const panel = interaction.options.getChannel('canale_pannello');
          const log = interaction.options.getChannel('canale_log');
          const category = interaction.options.getChannel('categoria_ticket');

          if (panel) config.panelChannelId = panel.id;
          if (log) config.logChannelId = log.id;
          if (category) config.ticketCategoryId = category.id;

          setConfig(guildId, config);

          return interaction.reply({
            content:
              `✅ Configurazione aggiornata.\n` +
              `- Pannello: ${config.panelChannelId ? `<#${config.panelChannelId}>` : 'non impostato'}\n` +
              `- Log: ${config.logChannelId ? `<#${config.logChannelId}>` : 'non impostato'}\n` +
              `- Categoria ticket: ${config.ticketCategoryId ? `<#${config.ticketCategoryId}>` : 'non impostata'}`,
            ephemeral: true,
          });
        }

        if (sub === 'staff') {
          const role = interaction.options.getRole('ruolo');
          config.staffRoleId = role.id;
          setConfig(guildId, config);
          return interaction.reply({ content: `✅ Ruolo staff impostato su ${role}.`, ephemeral: true });
        }

        if (sub === 'nome-ticket') {
          const format = interaction.options.getString('formato');
          config.ticketNameFormat = format;
          setConfig(guildId, config);
          return interaction.reply({ content: `✅ Formato ticket aggiornato in \`${format}\`.`, ephemeral: true });
        }

        if (sub === 'mostra') {
          const embed = new EmbedBuilder()
            .setTitle('Configurazione attuale ticket')
            .setColor(config.panel.color || '#5865F2')
            .addFields(
              { name: 'Canale pannello', value: config.panelChannelId ? `<#${config.panelChannelId}>` : 'Non impostato', inline: true },
              { name: 'Canale log', value: config.logChannelId ? `<#${config.logChannelId}>` : 'Non impostato', inline: true },
              { name: 'Categoria ticket', value: config.ticketCategoryId ? `<#${config.ticketCategoryId}>` : 'Non impostata', inline: true },
              { name: 'Ruolo staff', value: config.staffRoleId ? `<@&${config.staffRoleId}>` : 'Non impostato', inline: true },
              { name: 'Nome ticket', value: `\`${config.ticketNameFormat}\``, inline: true },
              { name: 'Titolo pannello', value: config.panel.title || 'N/D', inline: false },
              { name: 'Descrizione pannello', value: config.panel.description || 'N/D', inline: false },
              { name: 'Bottone pannello', value: `${config.panel.buttonEmoji || ''} ${config.panel.buttonLabel || 'N/D'}`, inline: false },
              { name: 'Messaggio benvenuto', value: config.ticket.welcomeMessage || 'N/D', inline: false }
            );

          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
      }

      if (interaction.commandName === 'ticket-grafica') {
        const sub = interaction.options.getSubcommand();

        if (sub === 'testi') {
          const modal = new ModalBuilder()
            .setCustomId('ticket_graphic_modal')
            .setTitle('Configura grafica pannello');

          const titleInput = new TextInputBuilder()
            .setCustomId('panel_title')
            .setLabel('Titolo pannello')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100)
            .setValue(config.panel.title || 'Apri un ticket');

          const descInput = new TextInputBuilder()
            .setCustomId('panel_description')
            .setLabel('Descrizione pannello')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000)
            .setValue(config.panel.description || 'Premi il pulsante qui sotto per aprire un ticket con lo staff.');

          const footerInput = new TextInputBuilder()
            .setCustomId('panel_footer')
            .setLabel('Footer pannello')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(100)
            .setValue(config.panel.footer || 'Supporto server');

          modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(footerInput)
          );

          return interaction.showModal(modal);
        }

        if (sub === 'bottone') {
          config.panel.buttonLabel = interaction.options.getString('testo');
          const emoji = interaction.options.getString('emoji');
          if (emoji) config.panel.buttonEmoji = emoji;
          setConfig(guildId, config);
          return interaction.reply({ content: '✅ Bottone ticket aggiornato.', ephemeral: true });
        }

        if (sub === 'colore') {
          const hex = interaction.options.getString('hex');
          if (!/^#([A-Fa-f0-9]{6})$/.test(hex)) {
            return interaction.reply({ content: '❌ Inserisci un colore HEX valido, per esempio `#5865F2`.', ephemeral: true });
          }
          config.panel.color = hex;
          setConfig(guildId, config);
          return interaction.reply({ content: `✅ Colore pannello aggiornato a ${hex}.`, ephemeral: true });
        }
      }

      if (interaction.commandName === 'ticket-messaggi') {
        const sub = interaction.options.getSubcommand();
        const text = interaction.options.getString('testo');

        if (sub === 'benvenuto') config.ticket.welcomeMessage = text;
        if (sub === 'presa-carico') config.ticket.claimMessage = text;
        if (sub === 'chiusura') config.ticket.closeMessage = text;

        setConfig(guildId, config);
        return interaction.reply({ content: '✅ Messaggio aggiornato.', ephemeral: true });
      }

      if (interaction.commandName === 'ticket-log') {
        const channel = interaction.options.getChannel('canale');
        config.logChannelId = channel.id;
        setConfig(guildId, config);
        return interaction.reply({ content: `✅ Canale log impostato su ${channel}.`, ephemeral: true });
      }

      if (interaction.commandName === 'ticket-add') {
        const tickets = getTickets();
        const ticketData = tickets[interaction.channel.id];
        if (!ticketData) {
          return interaction.reply({ content: '❌ Questo comando funziona solo dentro un ticket.', ephemeral: true });
        }

        const user = interaction.options.getUser('utente');
        await interaction.channel.permissionOverwrites.edit(user.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });

        return interaction.reply({ content: `✅ ${user} aggiunto al ticket.` });
      }

      if (interaction.commandName === 'ticket-remove') {
        const tickets = getTickets();
        const ticketData = tickets[interaction.channel.id];
        if (!ticketData) {
          return interaction.reply({ content: '❌ Questo comando funziona solo dentro un ticket.', ephemeral: true });
        }

        const user = interaction.options.getUser('utente');
        if (user.id === ticketData.ownerId) {
          return interaction.reply({ content: '❌ Non puoi rimuovere il proprietario del ticket.', ephemeral: true });
        }

        await interaction.channel.permissionOverwrites.delete(user.id);
        return interaction.reply({ content: `✅ ${user} rimosso dal ticket.` });
      }

      if (interaction.commandName === 'ticket-close') {
        const tickets = getTickets();
        const ticketData = tickets[interaction.channel.id];
        if (!ticketData) {
          return interaction.reply({ content: '❌ Questo comando funziona solo dentro un ticket.', ephemeral: true });
        }

        return closeTicket(interaction, interaction.channel, interaction.user, ticketData);
      }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'ticket_graphic_modal') {
      const config = getConfig(interaction.guild.id);
      config.panel.title = interaction.fields.getTextInputValue('panel_title');
      config.panel.description = interaction.fields.getTextInputValue('panel_description');
      config.panel.footer = interaction.fields.getTextInputValue('panel_footer') || 'Supporto server';
      setConfig(interaction.guild.id, config);

      return interaction.reply({ content: '✅ Grafica pannello aggiornata.', ephemeral: true });
    }

    if (interaction.isButton()) {
      const guildId = interaction.guild.id;
      const config = getConfig(guildId);
      const tickets = getTickets();

      if (interaction.customId === 'ticket_open') {
        const existing = Object.entries(tickets).find(
          ([, t]) => t.guildId === guildId && t.ownerId === interaction.user.id && !t.closed
        );

        if (existing) {
          return interaction.reply({ content: `❌ Hai già un ticket aperto: <#${existing[0]}>`, ephemeral: true });
        }

        config.counters.lastTicketNumber += 1;
        setConfig(guildId, config);

        const ticketNumber = String(config.counters.lastTicketNumber).padStart(4, '0');
        const channelName = sanitizeChannelName(
          formatText(config.ticketNameFormat, {
            user: interaction.user.username,
            number: ticketNumber,
            ticket: ticketNumber,
          }) || `ticket-${interaction.user.username}-${ticketNumber}`
        );

        const permissionOverwrites = [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.AttachFiles,
            ],
          },
        ];

        if (config.staffRoleId) {
          permissionOverwrites.push({
            id: config.staffRoleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          });
        }

        const channel = await interaction.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: config.ticketCategoryId || null,
          topic: `Ticket di ${interaction.user.tag} | ID ${interaction.user.id} | Ticket #${ticketNumber}`,
          permissionOverwrites,
        });

        tickets[channel.id] = {
          guildId,
          ownerId: interaction.user.id,
          claimedBy: null,
          createdAt: Date.now(),
          closed: false,
          ticketNumber,
        };
        setTickets(tickets);

        const embed = new EmbedBuilder()
          .setTitle(`Ticket #${ticketNumber}`)
          .setDescription(
            formatText(config.ticket.welcomeMessage, {
              user: `<@${interaction.user.id}>`,
              ticket: `#${ticketNumber}`,
              number: ticketNumber,
            })
          )
          .setColor(config.panel.color || '#5865F2');

        await channel.send({
          content: `${interaction.user}${config.staffRoleId ? ` <@&${config.staffRoleId}>` : ''}`,
          embeds: [embed],
          components: [buildTicketButtons()],
        });

        await sendOpenLog(interaction.guild, config, channel, interaction.user, ticketNumber);
        return interaction.reply({ content: `✅ Ticket creato: ${channel}`, ephemeral: true });
      }

      if (interaction.customId === 'ticket_claim') {
        const ticketData = tickets[interaction.channel.id];
        if (!ticketData) {
          return interaction.reply({ content: '❌ Questo pulsante funziona solo in un ticket.', ephemeral: true });
        }

        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const hasStaffRole = config.staffRoleId ? interaction.member.roles.cache.has(config.staffRoleId) : true;

        if (!isAdmin && !hasStaffRole) {
          return interaction.reply({ content: '❌ Solo lo staff può prendere in carico il ticket.', ephemeral: true });
        }

        if (ticketData.claimedBy) {
          return interaction.reply({ content: '❌ Questo ticket è già stato preso in carico.', ephemeral: true });
        }

        ticketData.claimedBy = interaction.user.id;
        tickets[interaction.channel.id] = ticketData;
        setTickets(tickets);

        await interaction.message.edit({ components: [buildTicketButtons(interaction.user.username)] });
        await sendClaimLog(interaction.guild, config, interaction.channel, interaction.user);

        return interaction.reply({
          content: formatText(config.ticket.claimMessage, { staff: `${interaction.user}` }),
        });
      }

      if (interaction.customId === 'ticket_close') {
        const ticketData = tickets[interaction.channel.id];
        if (!ticketData) {
          return interaction.reply({ content: '❌ Questo pulsante funziona solo in un ticket.', ephemeral: true });
        }

        return closeTicket(interaction, interaction.channel, interaction.user, ticketData);
      }
    }
  } catch (error) {
    console.error(error);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: '❌ Si è verificato un errore.', ephemeral: true }).catch(() => null);
    } else {
      await interaction.reply({ content: '❌ Si è verificato un errore.', ephemeral: true }).catch(() => null);
    }
  }
});

if (process.env.PORT) {
  http
    .createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Discord Ticket Bot online');
    })
    .listen(process.env.PORT, () => {
      console.log(`Health server attivo sulla porta ${process.env.PORT}`);
    });
}

client.login(process.env.TOKEN);
