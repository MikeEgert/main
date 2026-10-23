import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('http://127.0.0.1:8090/ocean.html');await page.getByRole('button',{name:'Dive in'}).waitFor();
const b=await page.locator('canvas').boundingBox();
// Hero fish is at x=74.5%, just below the vertical midpoint.
await page.mouse.click(b.x+b.width*.745,b.y+b.height*.52);await page.locator('#play-hud:not([hidden])').waitFor();
await page.screenshot({path:'/tmp/abyssal-gameplay-updated.png'});
await page.keyboard.press('p');await page.getByRole('heading',{name:'Ocean on pause.'}).waitFor();
await page.getByRole('button',{name:'Explore the model'}).click();await page.getByRole('button',{name:'Return to ocean →',exact:true}).click();await page.getByRole('heading',{name:'Ocean on pause.'}).waitFor();
const catches=await browser.newPage({viewport:{width:1440,height:1050}});catches.on('pageerror',e=>errors.push(e.message));await catches.addInitScript(()=>Math.random=()=>.5);await catches.goto('http://127.0.0.1:8090/ocean.html');await catches.getByRole('button',{name:'Dive in'}).click();
await catches.locator('.catch-score').first().waitFor();assert.ok(await catches.locator('.catch-score').count()<=8);await catches.screenshot({path:'/tmp/abyssal-catch-updated.png'});await catches.waitForTimeout(3000);assert.equal(await catches.locator('.catch-score').count(),0);
await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.getByRole('button',{name:'Dive in'}).waitFor();
assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['click fish to start','model return preserves pause','catch feedback bounded to eight labels','expired effects removed','reduced-motion rendering'],browserErrors:errors}));
}finally{await browser.close();}
