const cheerio = require('cheerio');
const fetch = require('node-fetch');
const schedule = require("node-schedule");
const Telegraf = require("telegraf");
const puppeteer = require("puppeteer");
const Discord = require('discord.js');
const bot = new Discord.Client();
const env = require('dotenv');
env.config();

const ACCESS_TOKEN_TELEGRAM = process.env.ACCESS_TOKEN_TELEGRAM;
const CHAT_ID = process.env.CHAT_ID;

const token =process.env.token;

class Tracker {
    constructor(telegramBot) {
        this.telegramBot = telegramBot;

        this.dolar = {
            compra: 0,
            venta: 0,
            fecha: ''
        }
        this.temperature = {
            temperatura : 0,
            clima : '',
            sensacion : '',
            maxima: '',
            minima: '',
            humedad: ''
        }
        this.transferwise = {
            valor: 0
        }
    };

    async initialize() {
        this.setDataAndNotify();
        this.waterReminder();
        this.getTemp();
        this.scrape();

        schedule.scheduleJob("0 */1 * * *", () => {
            this.setDataAndNotify();
            this.waterReminder();
            this.getTemp();
            this.scrape();
        });
    };

    async load() {
        await fetch('http://www.dolarhoy.com/')
            .then(res => res.text())
            .then(body => {
                let $ = cheerio.load(body);
                this.dolar.fecha = $('.update').text();
                let items = [];
                items.push($('.pull-right').first().text());
                items.push($('.pull-right').last().text());
                this.dolar.compra = items[1];
                this.dolar.venta = items[0];
                console.log(this.dolar);
            });
    }

    async getTemp() {
        await fetch('https://weather.com/es-AR/tiempo/hoy/l/-31.65,-60.71?par=google&temp=c')
            .then(res => res.text())
            .then( body => {
                let $ = cheerio.load(body);
                let minmax = [];
                this.temperature.temperatura = $('.today_nowcard-temp').text();
                this.temperature.clima = $('.today_nowcard-phrase').text();
                this.temperature.sensacion = $('.deg-feels').text();
                $('.deg-hilo-nowcard').each(function (i, elem) {
                    minmax[i] = $(this).text();
                });
                minmax.join(', ');
                this.temperature.maxima = minmax[0];
                this.temperature.minima = minmax[1];
                this.temperature.humedad = $('.today_nowcard-sidecar table tbody tr:nth-of-type(2) td ').text();
                console.log(this.temperature)
            })
        this.telegramBot.telegram.sendMessage(
            CHAT_ID,
            `Temperatura en Santa Fe: ${this.temperature.temperatura}, ${this.temperature.clima}.`
        )
        this.telegramBot.telegram.sendMessage(
            CHAT_ID,
            `La sensacion termica es de ${this.temperature.sensacion}. Minima: ${this.temperature.minima} Maxima: ${this.temperature.maxima} Humedad:${this.temperature.humedad}`
        )
    }

   async setDataAndNotify() {
        await this.load();
        this.telegramBot.telegram.sendMessage(
            CHAT_ID,
            `${String.fromCodePoint(0x1F4B5)}| Dolar | Compra: ${this.dolar.compra}, Venta: ${this.dolar.venta}, Ultima actualizacion: ${this.dolar.fecha}`
        )
    }

    waterReminder() {
        this.telegramBot.telegram.sendMessage(CHAT_ID, `${String.fromCodePoint(0x1F4A7)} Toma agua forro`)
    }

     async scrape ()  {
        const transfer = 'https://transferwise.com/';
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto(transfer, {waitUntil: 'networkidle2'});
        (async () => {
            await page.waitForSelector('.tw-money-input > .input-group-btn:nth-child(2) > .btn-group > .btn > span:nth-child(1)');
            await page.click('.tw-money-input > .input-group-btn:nth-child(2) > .btn-group > .btn > span:nth-child(1)');
            await page.waitForSelector('.dropdown-menu > .tw-dropdown-item--divider > .tw-select-filter-link > .input-group > .tw-select-filter');
            await page.keyboard.type('USD');
            await page.keyboard.press('Enter');

            await page.waitFor(1000);

            await page.waitForSelector('.form-group:nth-child(3) > .tw-money-input > .input-group-btn > .btn-group > .btn');
            await page.click('.form-group:nth-child(3) > .tw-money-input > .input-group-btn > .btn-group > .btn');
            await page.waitForSelector('.dropdown-menu > .tw-dropdown-item--divider > .tw-select-filter-link > .input-group > .tw-select-filter');
            await page.keyboard.type('ARS');
            await page.keyboard.press('Enter');

            await page.waitFor(1000);
            await page.waitForSelector('.tw-calculator-breakdown-rate__value');
            const element = await page.$('.tw-calculator-breakdown-rate__value');
            const result = await page.evaluate(element => element.textContent, element);
            this.transferwise.valor = result;
            console.log(`transferwise: $ ${result}`);
            this.telegramBot.telegram.sendMessage(CHAT_ID, `transferwise: $ ${result}`);
        })()
    };

}


const telegramBot = new Telegraf(process.env.ACCESS_TOKEN_TELEGRAM);

//discord
let count = 0;
let arielCount = 0;
let toDos = [];

bot.login(process.env.token);

bot.on('ready', ()=> {
    console.info('logged in');
});

bot.on('message', msg => {


    if (msg.content === 'ping') {
        msg.channel.send('pong');
    }
    if (msg.content === 'dolar') {
        msg.channel.send(`${String.fromCodePoint(0x1F4B5)}| Dolar | Compra: ${tracker.dolar.compra}, Venta: ${tracker.dolar.venta}, Ultima actualizacion: ${tracker.dolar.fecha}`)
    }
    if (msg.content === 'transfer') {
        msg.channel.send(`Hoy transfer nos caga al siguiente valor: $${tracker.transferwise.valor}`)
    }
    if (msg.content === 'yapago') {
        msg.channel.send('El gordo no pago un choto')
    }
    if (msg.content === 'ariel') {
        arielCount++;
        msg.channel.send(`dias sin que ariel se mande una cagada : ${arielCount}`)
    }
    if (msg.content === '!viernes') {
        msg.channel.send('POR FAVOR NO HACER DEPLOY LOS VIERNES!!!!')
    }
    if (msg.content === 'amo mi trabajo') {
        count++;
        msg.channel.send(`cantidad de veces que me dieron ganas de suicidarme hoy: ${count}`)
    }
    if(msg.content === 'gigared') {
        msg.channel.send('veces que a ariel se le cayo el internet : 1000055500')
    }
    if(msg.content.includes('agendar ')){
        let res = msg.content.replace('agendar ', '');
        toDos.push(res);
        console.log(toDos);
    }
    if(msg.content === '!agenda') {
        toDos.forEach(item => {
            msg.channel.send(`${item}`)
        })
    }
});

//telegram
telegramBot.hears("hola", ctx => ctx.reply('hola'));
telegramBot.on('text', ctx => {
    if (ctx.message.text === 'hi') {
        ctx.reply('hi there')
    }
});
telegramBot.on('text', (ctx) => ctx.reply('Hello World'));
telegramBot.launch();

 const tracker = new Tracker(telegramBot);
tracker.initialize();


