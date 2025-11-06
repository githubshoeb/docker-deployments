import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  //app.use('/sign', express.json({ limit: '2mb' }));
  await app.listen(8080);
}
bootstrap();
