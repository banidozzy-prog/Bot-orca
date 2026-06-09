const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Memória do Bot
const FILAS = { 'ss-mob': [], 'ss-emu': [] };
const CHAMADOS = {};

// 1. Comando de Setup (Rodar uma vez no canal)
client.on('messageCreate', async (msg) => {
    if (msg.content === '!setup-fila') {
        const embed = new EmbedBuilder().setTitle('🛡️ Fila de SS').setDescription('Ninguém na fila.');
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('entrar_fila').setLabel('Entrar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('sair_fila').setLabel('Sair').setStyle(ButtonStyle.Danger)
        );
        msg.channel.send({ embeds: [embed], components: [row] });
    }
});

// 2. Lógica Automática de Fila
client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;
    const canal = i.channel.name;
    if (!FILAS[canal]) return; // O bot só funciona em canais que ele reconhece

    if (i.customId === 'entrar_fila') {
        if (!FILAS[canal].includes(i.user.id)) FILAS[canal].push(i.user.id);
    } else {
        FILAS[canal] = FILAS[canal].filter(id => id !== i.user.id);
    }

    const lista = FILAS[canal].map((id, n) => `${n + 1}. <@${id}>`).join('\n') || 'Vazia';
    const embed = EmbedBuilder.from(i.message.embeds[0]).setDescription(`**Fila de SS Disponíveis**\n\n${lista}`);
    await i.update({ embeds: [embed] });
});

// 3. Sistema de Chamada Automática (!ss mob 12)
client.on('messageCreate', async (msg) => {
    if (!msg.content.startsWith('!ss ')) return;
    const [_, tipo, idAlvo] = msg.content.split(' ');
    
    // O bot procura o canal que contenha o nome (ex: "ss-mob")
    const canal = msg.guild.channels.cache.find(c => c.name.includes(`ss-${tipo}`));
    if (!canal) return msg.reply('❌ Crie um canal com "ss-mob" ou "ss-emu" no nome.');

    CHAMADOS[Date.now()] = { adm: msg.author.toString(), canalId: canal.id, timestamp: Date.now() };

    const embed = new EmbedBuilder()
        .setTitle('🚨 Novo Chamado').addFields({ name: 'ADM', value: msg.author.toString() }, { name: 'Alvo', value: idAlvo });
    
    canal.send({ embeds: [embed] });
    msg.reply('✅ Chamado enviado!');
});

// 4. Watchdog (Apaga se ninguém atender)
setInterval(async () => {
    for (const [id, data] of Object.entries(CHAMADOS)) {
        if (Date.now() - data.timestamp > 1500000) { // 25 min
            const canal = client.channels.cache.get(data.canalId);
            if (canal) canal.send(`${data.adm}, 0 SS online após 25min. Reembolso liberado.`);
            delete CHAMADOS[id];
        }
    }
}, 60000);

client.login('SEU_TOKEN_AQUI');
