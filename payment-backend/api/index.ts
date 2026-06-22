import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';

const server = express();

export const bootstrap = async (expressInstance: any) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.init();
  return app;
};

// Bootstrap immediately for Vercel
bootstrap(server);

export default server;
