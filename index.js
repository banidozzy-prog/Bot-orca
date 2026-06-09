const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

const FILAS = { 'ss-mob': [], 'ss-emu': [] };
const CHAMADOS = {};

client.once('ready', () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
});

// 1. COMANDO PARA CRIAR O PAINEL DE FILA
client.on('messageCreate', async (msg) => {
    if (msg.content === '!setup-fila') {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Fila de SS Disponíveis')
            .setDescription('Ninguém na fila no momento.')
            .setColor('#2F3136');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('entrar_fila').setLabel('Entrar na fila').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('sair_fila').setLabel('Sair da fila').setStyle(ButtonStyle.Danger)
        );
        await msg.channel.send({ embeds: [embed], components: [row] });
        await msg.delete();
    }
});

// 2. LÓGICA DE FILA (BOTÕES)
client.on('interactionCreate', async (i) => {
    if (!i.isButton()) return;
    const canal = i.channel.name;
    if (!FILAS[canal]) return;

    if (i.customId === 'entrar_fila') {
        if (!FILAS[canal].includes(i.user.id)) FILAS[canal].push(i.user.id);
    } else if (i.customId === 'sair_fila') {
        FILAS[canal] = FILAS[canal].filter(id => id !== i.user.id);
    }

    const lista = FILAS[canal].map((id, n) => `${n + 1}. <@${id}>`).join('\n') || 'Ninguém na fila.';
    const embed = EmbedBuilder.from(i.message.embeds[0]).setDescription(`**Fila de SS Disponíveis**\n\n${lista}`);
    await i.update({ embeds: [embed] });
});

// 3. COMANDO PARA CHAMAR ANÁLISE (!ss mob [ID])
client.on('messageCreate', async (msg) => {
    if (!msg.content.startsWith('!ss ')) return;
    const args = msg.content.split(' ');
    const tipo = args[1]; // mob ou emu
    const idAlvo = args[2];

    const canal = msg.guild.channels.cache.find(c => c.name.includes(`ss-${tipo}`));
    if (!canal) return msg.reply('❌ Canal não encontrado. Certifique-se de que o nome contém "ss-mob" ou "ss-emu".');

    const timestamp = Date.now();
    CHAMADOS[timestamp] = { adm: msg.author.toString(), canalId: canal.id, timestamp: timestamp };

    const embed = new EmbedBuilder()
        .setTitle('🚨 Novo Chamado de Análise')
        .addFields(
            { name: 'ADM', value: msg.author.toString(), inline: true }, 
            { name: 'ID do Alvo', value: idAlvo || 'Não informado', inline: true }
        )
        .setColor('#FF0000');
    
    await canal.send({ embeds: [embed] });
    msg.reply('✅ Chamado enviado com sucesso!');
});

// 4. WATCHDOG (LIMPEZA AUTOMÁTICA DE 25 MIN)
setInterval(async () => {
    for (const [id, data] of Object.entries(CHAMADOS)) {
        if (Date.now() - data.timestamp > 1500000) { // 25 Minutos
            const canal = client.channels.cache.get(data.canalId);
            if (canal) await canal.send(`${data.adm}, prazo de 25 minutos expirado. Reembolso liberado.`);
            delete CHAMADOS[id];
        }
    }
}, 60000);

// LOGIN USANDO VARIÁVEL DE AMBIENTE "TOKEN"
client.login(process.env.TOKEN).catch(err => {
    console.error("❌ Erro de login: Verifique se a variável 'TOKEN' foi configurada no ShardCloud.");
});

