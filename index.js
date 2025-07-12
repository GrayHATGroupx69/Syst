const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ✅ أوامر Slash
const commands = [
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('تبنّد عضو')
    .addUserOption(opt => opt.setName('user').setDescription('اختار العضو').setRequired(true)),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('تطرد عضو')
    .addUserOption(opt => opt.setName('user').setDescription('اختار العضو').setRequired(true)),

  new SlashCommandBuilder()
    .setName('role')
    .setDescription('تعطي أو تشيل رول من عضو')
    .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('الرول').setRequired(true)),

  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('يعرض صورة بروفايل عضو')
    .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(false))
].map(cmd => cmd.toJSON());

// 🟢 تسجيل الأوامر
client.once('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ الأوامر جاهزة');
  } catch (err) {
    console.error(err);
  }
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// 🎮 التعامل مع الأوامر
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const user = interaction.options.getUser('user');
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (interaction.commandName === 'ban' || interaction.commandName === 'kick') {
    if (!member) return interaction.reply({ content: 'ما قدرت ألقى العضو', ephemeral: true });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('reason1').setLabel('بدون سبب').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('reason2').setLabel('ملحد').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('reason3').setLabel('نشر').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel').setLabel('❌ إلغاء').setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ content: `اختر سبب ${interaction.commandName === 'ban' ? 'الباند' : 'الكيك'} لـ ${user.tag}`, components: [row], ephemeral: true });

    const filter = i => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000, max: 1 });

    collector.on('collect', async btn => {
      if (btn.customId === 'cancel') {
        await btn.update({ content: '🚫 تم الإلغاء', components: [] });
      } else {
        const reason = btn.customId === 'reason1' ? 'بدون سبب' : btn.customId === 'reason2' ? 'ملحد' : 'نشر';
        try {
          if (interaction.commandName === 'ban') await member.ban({ reason });
          else await member.kick(reason);
          await btn.update({ content: `✅ تم ${interaction.commandName === 'ban' ? 'تبنيد' : 'طرد'} ${user.tag} - السبب: ${reason}`, components: [] });
        } catch (err) {
          await btn.update({ content: `❌ ما قدرت أنفذ الأمر`, components: [] });
        }
      }
    });
  }

  if (interaction.commandName === 'role') {
    const role = interaction.options.getRole('role');
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
      interaction.reply({ content: `❎ تم إزالة الرول ${role.name} من ${user.tag}`, ephemeral: true });
    } else {
      await member.roles.add(role);
      interaction.reply({ content: `✅ تم إعطاء الرول ${role.name} لـ ${user.tag}`, ephemeral: true });
    }
  }

  if (interaction.commandName === 'avatar') {
    const target = user || interaction.user;
    const embed = new EmbedBuilder()
      .setTitle(`صورة ${target.username}`)
      .setImage(target.displayAvatarURL({ size: 1024 }))
      .setColor(0x2b2d31);
    interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
