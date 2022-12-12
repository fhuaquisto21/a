import { chromium } from "playwright";
import * as fs from "fs";

const url_pelis = "https://cuevana.pizza/peliculas?page=";
const url_series = "https://cuevana.pizza/series?page=";

const pages_pelis = 462;
const pages_series = 64;

const get_pelis = async () => {
  let iter_pelis = 1;
  for (let i = 1; i < pages_pelis + 1; i++) {
    const browser = await chromium.launch({ executablePath: '/bin/brave-browser', headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${url_pelis}${i}`, { timeout: 1000000 });
    const items = await page.$$(".movie-item a");

    for (const item of items) {
      const url = await item.getAttribute("href");
      const title = await (await item.$(".item-detail p")).textContent();
      const data = {
        url,
        title,
      };
      const sdata = JSON.stringify(data, null, 4);
      fs.writeFileSync(`./data/pelis/${iter_pelis}.json`, sdata);
      iter_pelis++;
    }

    await browser.close();
  }
}

const get_series = async () => {
  let iter_series = 1;
  for (let i = 1; i < pages_series + 1; i++) {
    const browser = await chromium.launch({ executablePath: '/bin/brave', headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${url_series}${i}`, { timeout: 1000000 });
    const items = await page.$$(".movie-item a");

    for (const item of items) {
      const url = await item.getAttribute("href");
      const title = await (await item.$(".item-detail p")).textContent();
      const data = {
        url,
        title,
      };
      const sdata = JSON.stringify(data, null, 4);
      fs.writeFileSync(`./data/series/${iter_series}.json`, sdata);
      iter_series++;
    }

    await browser.close();
  }
}

const get_content_pelis = async () => {
  for (let i = 6929; i < 8306; i++) {
    const crude = fs.readFileSync(`./data/pelis/${i}.json`);
    const data = JSON.parse(crude);

    const browser = await chromium.launch({ executablePath: '/bin/brave-browser', headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(data.url, { timeout: 1000000 });

    const info_time = await page.$('p.meta') ? (await (await page.$('p.meta')).textContent()).trim().split('  ·  ') : ['', ''];
    const info_data = await Promise.all(
      (
        await page.$$('.info-list li')).map(async a => {
          const text_general = (await a.textContent()).trim().split(': ');
	  if (text_general.length < 2) {
	    return [];
	  }
          if (text_general[0] == 'Actores') {
            return text_general[1].split(', ');
          }
          return text_general[1].split('  ');
        }
      )
    );

    const info_description = await (await page.$('.description p')).textContent();
    const info_cover = (await (await page.$('figure.poster img')).getAttribute('src')).replace('200', '###');

    const info_players = await page.$$('#player > ul > li');
    const players = [];
    for (const inf_player of info_players) {
      const type = await inf_player.$('img') ? (await (await inf_player.$('img')).getAttribute('src')).split('/').at(-1).split('.')[0] : 'yt';
      if (type === 'yt') {
        continue;
      }
      const player = {
        type,
        urls: await Promise.all(
          (await inf_player.$$('ul li')).map(async a => await a.getAttribute('data-server'))
        )
      };
      players.push(player);
    }

    const downloads = await Promise.all(
      (await page.$$('ul.section-downloads-options li a')).map(async a => {
        const aurl =  await a.getAttribute('href');
        const type = (await (await a.$('img')).getAttribute('src')).split('/').at(-1).split('.')[0];
        const bpage = await context.newPage();
        await bpage.goto(aurl, { timeout: 10000000 });
        const url = await bpage.url();
        await bpage.close();
        return { url, type };
      })
    );
    const sdata = JSON.stringify({ url: data.url, title: data.title, duration: info_time[0], year: info_time[1], genres: info_data[0], actors: info_data[1], description: info_description, cover: info_cover, players, downloads }, null, 4);
    fs.writeFileSync(`./full/pelis/${i}.json`, sdata);
    console.log(i);
    await browser.close();
  }
}

get_content_pelis();
