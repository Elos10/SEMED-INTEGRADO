import type {IncomingMessage,ServerResponse} from 'node:http';
import {buildApp} from './app.js';

const appPromise=buildApp().then(async app=>{
 await app.ready();
 return app;
});

export async function handleVercelRequest(request:IncomingMessage,response:ServerResponse){
 const app=await appPromise;
 app.server.emit('request',request,response);
}
