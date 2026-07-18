import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  async chat(message: string) {
    return {
      reply: `AI Demo: "${message}" sorunu aldım. Bir sonraki aşamada OpenAI ile cevap vereceğim.`,
    };
  }
}