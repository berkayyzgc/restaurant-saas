import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessAiService {
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
  ) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY ortam değişkeni tanımlanmamış.',
      );
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  async chat(
    message: string,
    restaurantId: number,
  ) {
    const restaurant =
      await this.prisma.restaurant.findUnique({
        where: {
          id: restaurantId,
        },
        select: {
          id: true,
          name: true,
          city: true,
          description: true,
        },
      });

    if (!restaurant) {
      throw new NotFoundException(
        'Restoran bulunamadı.',
      );
    }

    try {
      const response =
        await this.openai.responses.create({
          model: 'gpt-5-mini',
          instructions: `
Sen Restaurant OS işletme asistanısın.

Restoran adı: ${restaurant.name}
Şehir: ${restaurant.city}
Açıklama: ${restaurant.description ?? 'Belirtilmemiş'}

Türkçe cevap ver.
Kısa, anlaşılır ve profesyonel ol.
Henüz gerçek satış verileri sana verilmediyse veri uydurma.
Bilmediğin bir bilgi için açıkça yeterli veri olmadığını söyle.
          `.trim(),
          input: message,
        });

      const reply = response.output_text?.trim();

      return {
        reply:
          reply ||
          'Şu anda yanıt oluşturulamadı.',
      };
    } catch (error) {
      console.error(
        'Business AI request failed:',
        error,
      );

      throw new InternalServerErrorException(
        'AI yanıtı oluşturulamadı.',
      );
    }
  }
}