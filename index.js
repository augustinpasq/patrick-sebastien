// Import des dépendances et des données
const { Client, GatewayIntentBits , EmbedBuilder, AttachmentBuilder } = require("discord.js")
const { createAudioPlayer, joinVoiceChannel, VoiceConnectionStatus, createAudioResource, StreamType } = require('@discordjs/voice')
const { createReadStream } = require('node:fs')
const { join } = require('node:path')
const cron = require("node-cron")
const { token, guildId, channelId, voiceChannelId } = require("./config.json")
const data = require("./data.json")

// Constantes et variables globales
const CHANNEL = channelId
const MESSAGE_HEAD = "Hey @everyone !"
const MESSAGE_BODY_1 = "fête ses"
const MESSAGE_BODY_2 = "ans aujourd'hui ! Souhaitez-lui un excellent anniversaire ! Bon anniversaire"
const MESSAGE_TAIL = "! :partying_face:"

// Création d'une instance de bot
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] })

// Création des modules du vocal
let connection
const soundPlayer = createAudioPlayer()

// Détermine si une date est passée
function isPassed(date) {
	let today = new Date()
	date.setUTCFullYear(today.getUTCFullYear())
	let diff = today.getTime() - date.getTime()

	return (diff > 0)
}

// Fonction de calcul de l'âge
function getAge(date) {
	let diff = Date.now() - date.getTime()
	let age = new Date(diff)

	return Math.abs(age.getUTCFullYear() - 1970)
}

// Fonction de calcul du nombre de jours restants
function remainingDays(date) {
	let today = new Date()
	isPassed(date) ? date.setUTCFullYear(date.getUTCFullYear() + 1) : date
	let diff = today.getTime() - date.getTime()

	return Math.trunc(Math.abs(diff / (1000 * 3600 * 24)) + 1)
}

// Fonction de génération de l'embed
function generateEmbed(embed) {
	for (let i in data) {
		let date = new Date(data[i]["year"], data[i]["month"], data[i]["day"])
		embed.addFields([
			{ name: data[i]["name"], value: `${date.toLocaleDateString("fr-FR", { month: "long", day: "numeric" })} (${getAge(date)} ans)`, inline: true }
		])
	}
}

async function isInChannel() {
	const voiceChannel = await client.channels.fetch(voiceChannelId)
	return voiceChannel.members.has(client.application.id)
}

async function canUseBot(user) {
	const voiceChannel = await client.channels.fetch(voiceChannelId)
	return voiceChannel.members.has(user)
}

// Confirmation de lancement du bot
client.once("clientReady", () => {
	client.user.setActivity("le calendrier", { type: "WATCHING" })
	console.log("Logged in as Patrick Sébastien!")
})

// Envoi des messages d'anniversaire
client.on("clientReady", () => {
	cron.schedule("0 0 9 * * *", async () => {
		let today = new Date()

		for (let i in data) {
			if (data[i]["day"] === today.getDate() && data[i]["month"] === today.getMonth()) {

				let date = new Date(data[i]["year"], data[i]["month"], data[i]["day"])
				let age = getAge(date)

				let message = `${MESSAGE_HEAD} ${data[i]["id"]} ${MESSAGE_BODY_1} ${age} ${MESSAGE_BODY_2} ${data[i]["name"]} ${MESSAGE_TAIL}`
				await client.channels.cache.get(CHANNEL).send(message)
			}
		}
	})
})

// Réponse aux commandes
client.on("interactionCreate", async interaction => {

	if (!interaction.isChatInputCommand()) return

	const { commandName } = interaction

	if (commandName === "birthdays") {
		let membersAge = []
		for (let i in data) {
			let date = new Date(data[i]["year"], data[i]["month"], data[i]["day"])
			let age = getAge(date)
			membersAge.push(age)
		}

		let avg = 0
		for (let i in membersAge) { avg += membersAge[i] }
		avg = avg / (membersAge.length)

		const attachment = new AttachmentBuilder("./images/embedThumbnail.webp", "embedThumbnail.webp")
		const birthdays = new EmbedBuilder()
			.setColor("#DD2E44")
			.setTitle("Joyeux anniversaire !")
			.setDescription("Voici tous les anniversaires à souhaiter :")
			.setThumbnail("attachment://embedThumbnail.webp")
			.setTimestamp()
			.setFooter({ text: `Moyenne d"âge du serveur : ${Math.round(avg)} ans`, iconURL: "https://cdn.discordapp.com/app-icons/775422653636149278/23f4ec953794de102fa556d1ef625582.png" })

		generateEmbed(birthdays)
		await interaction.reply({ embeds: [birthdays], files: [attachment] })
	}

	else if (commandName === "next-birthday") {

		let date, age, member
		for (let i = 0; i < data.length; i++) {
			let memberDate = new Date(data[i]["year"], data[i]["month"], data[i]["day"])

			date = memberDate
			age = getAge(memberDate)
			member = i

			if (!isPassed(memberDate)) break
		}

		const nextBirthday = new EmbedBuilder()
			.setColor("#DD2E44")
			.setTitle("Un anniversaire approche...")
			.setDescription(`Dans ${remainingDays(date)} jours, on arrosera les ${age + 1} ans de ${data[member]["name"]} ! :tada:`)
			.setTimestamp()
			.setFooter({ text: "Patrick Sébastien", iconURL: "https://cdn.discordapp.com/app-icons/775422653636149278/23f4ec953794de102fa556d1ef625582.png" })
		await interaction.reply({ embeds: [nextBirthday] })
	}

	else if (commandName === "birthday-info") {
		const givenMember = interaction.options.getUser("user")

		let member = data.find(member => member["id"] === `<@${givenMember["id"]}>`)

		if (member !== undefined) {
			let date = new Date(member["year"], member["month"], member["day"])

			const birthdayInfo = new EmbedBuilder()
				.setColor("#DD2E44")
				.setTitle(`L'anniversaire de ${member["name"]}`)
				.setDescription(`${member["name"]} fête son anniversaire le **${date.toLocaleDateString("fr-FR", { month: "long", day: "numeric" })}** et a donc actuellement **${getAge(date)} ans**. Son prochain anniversaire est dans **${remainingDays(date)} jours**. :birthday:`)
				.setTimestamp()
				.setFooter({ text: "Patrick Sébastien", iconURL: "https://cdn.discordapp.com/app-icons/775422653636149278/23f4ec953794de102fa556d1ef625582.png" })
			await interaction.reply({ embeds: [birthdayInfo] })
		}

		else {
			const birthdayError = new EmbedBuilder()
				.setColor("#DD2E44")
				.setTitle("Désolé, je n'ai trouvé d'anniversaire...")
				.setTimestamp()
				.setFooter({ text: "Patrick Sébastien", iconURL: "https://cdn.discordapp.com/app-icons/775422653636149278/23f4ec953794de102fa556d1ef625582.png" })
			await interaction.reply({ embeds: [birthdayError] })
		}
	}

	else if (commandName === "join") {
		let inc = await isInChannel()
		let cub = await canUseBot(interaction.user.id) 
	
		if (!inc && cub) {

			connection = joinVoiceChannel({
				channelId: voiceChannelId,
				guildId: guildId,
				adapterCreator: interaction.guild.voiceAdapterCreator,
			})
			
			connection.subscribe(soundPlayer)

			connection.on(VoiceConnectionStatus.Disconnected, () => {
				connection.destroy()
			})

			const channelJoined = new EmbedBuilder()
				.setColor("#DD2E44")
				.setTitle("Me voilà parmi vous !")
				.setDescription("J'ai rejoint le salon vocal. :musical_note:")
				.setTimestamp()
				.setFooter({ text: "Patrick Sébastien", iconURL: "https://cdn.discordapp.com/app-icons/775422653636149278/23f4ec953794de102fa556d1ef625582.png" })
			await interaction.reply({ embeds: [channelJoined] })

		} else if (inc) {
			const channelJoined = new EmbedBuilder()
				.setColor("#DD2E44")
				.setTitle("Je suis déjà parmi vous...")
				.setTimestamp()
				.setFooter({ text: "Patrick Sébastien", iconURL: "https://cdn.discordapp.com/app-icons/775422653636149278/23f4ec953794de102fa556d1ef625582.png" })
			await interaction.reply({ embeds: [channelJoined] })

		} else if (!cub) {
			const notAllowed = new EmbedBuilder()
				.setColor("#DD2E44")
				.setTitle("Tu ne peux pas faire ça !")
				.setDescription("Tu dois être dans le salon vocal...")
				.setTimestamp()
				.setFooter({ text: "Patrick Sébastien", iconURL: "https://cdn.discordapp.com/app-icons/775422653636149278/23f4ec953794de102fa556d1ef625582.png" })
			await interaction.reply({ embeds: [notAllowed] })
		}
	}

	else if (commandName === "leave") {
		let inc = await isInChannel()
		let cub = await canUseBot(interaction.user.id) 

		if (inc && cub) {
			connection.destroy()

			const channelLeft = new EmbedBuilder()
				.setColor("#DD2E44")
				.setTitle("À la prochaine !")
				.setDescription("J'ai quitté le salon vocal. :dash:")
				.setTimestamp()
				.setFooter({ text: "Patrick Sébastien", iconURL: "https://cdn.discordapp.com/app-icons/775422653636149278/23f4ec953794de102fa556d1ef625582.png" })
			await interaction.reply({ embeds: [channelLeft] })

		} else if (!inc) {
			const botNotInChannel = new EmbedBuilder()
				.setColor("#DD2E44")
				.setTitle("Je ne suis pas dans le salon vocal...")
				.setTimestamp()
				.setFooter({ text: "Patrick Sébastien", iconURL: "https://cdn.discordapp.com/app-icons/775422653636149278/23f4ec953794de102fa556d1ef625582.png" })
			await interaction.reply({ embeds: [botNotInChannel] })

		} else if (!cub) {
			const notAllowed = new EmbedBuilder()
				.setColor("#DD2E44")
				.setTitle("Tu ne peux pas faire ça !")
				.setDescription("Tu dois être dans le salon vocal...")
				.setTimestamp()
				.setFooter({ text: "Patrick Sébastien", iconURL: "https://cdn.discordapp.com/app-icons/775422653636149278/23f4ec953794de102fa556d1ef625582.png" })
			await interaction.reply({ embeds: [notAllowed] })
		}
	}
})

// Joue un son quand quelqu'un rejoint le salon vocal
client.on('voiceStateUpdate', event => {

	if (event.channelId == null) {
		if (event.id !== client.user.id) {
			let member = data.find(member => member["id"] === `<@${event.id}>`)
			soundPlayer.play(createAudioResource(createReadStream(join(__dirname, member["intro"]), { inputType: StreamType.OggOpus, inlineVolume: true })))
		}
	} else if (event.channelId === voiceChannelId && event.id !== client.user.id) {
		soundPlayer.play(createAudioResource(createReadStream(join(__dirname, "./sounds/outro.ogg"), { inputType: StreamType.OggOpus, inlineVolume: true })))
	}
})

// Connexion du bot
client.login(token).catch(err => console.log(err))
