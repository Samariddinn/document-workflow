import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  count = 0;
  getHello(): string {
    return 'Hello World!';
  }
}
