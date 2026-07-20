import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async chat(message: string, restaurantId: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        menuItems: {
          where: {
            isAvailable: true,
          },
          include: {
            category: true,
          },
          orderBy: {
            price: 'asc',
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restoran bulunamadı.');
    }

    const normalizedMessage = message.toLocaleLowerCase('tr-TR');
    const menuItems = restaurant.menuItems;

    if (menuItems.length === 0) {
      return {
        reply: 'Şu anda önerilebilecek müsait bir ürün bulunmuyor.',
        suggestions: [],
      };
    }

    let filteredItems = [...menuItems];

    const budgetMatch = normalizedMessage.match(
      /(?:₺|tl)?\s*(\d+(?:[.,]\d+)?)\s*(?:₺|tl)/i,
    );

    if (budgetMatch) {
      const budget = Number(budgetMatch[1].replace(',', '.'));

      filteredItems = filteredItems.filter(
        (item) => Number(item.price) <= budget,
      );
    }

    const searchableWords = normalizedMessage
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 3)
      .filter(
        (word) =>
          ![
            'bana',
            'bir',
            'şey',
            'öner',
            'önerir',
            'misin',
            'istiyorum',
            'olsun',
            'altında',
            'fiyat',
            'menü',
            'yemek',
            'acısız',
            'acılı',
            'yiyecek',
          ].includes(word),
      );

   const wantsFood =
  normalizedMessage.includes('yemek') ||
  normalizedMessage.includes('yiyecek') ||
  normalizedMessage.includes('acı') ||
  normalizedMessage.includes('acısız') ||
  normalizedMessage.includes('hafif') ||
  normalizedMessage.includes('doyurucu');

const wantsDrink =
  normalizedMessage.includes('içecek') ||
  normalizedMessage.includes('içmek') ||
  normalizedMessage.includes('soğuk içecek') ||
  normalizedMessage.includes('sıcak içecek');

if (wantsFood && !wantsDrink) {
  filteredItems = filteredItems.filter((item) => {
    const categoryName =
      item.category?.name.toLocaleLowerCase('tr-TR') ?? '';

    return !categoryName.includes('içecek');
  });
}

if (wantsDrink) {
  filteredItems = filteredItems.filter((item) => {
    const categoryName =
      item.category?.name.toLocaleLowerCase('tr-TR') ?? '';

    return categoryName.includes('içecek');
  });
}

if (searchableWords.length > 0) {
  const matchingItems = filteredItems.filter((item) => {
    const searchableText = [
      item.name,
      item.description ?? '',
      item.category?.name ?? '',
    ]
      .join(' ')
      .toLocaleLowerCase('tr-TR');

    return searchableWords.some((word) =>
      searchableText.includes(word),
    );
  });

  if (matchingItems.length > 0) {
    filteredItems = matchingItems;
  }
}

    const suggestions = filteredItems.slice(0, 3).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      category: item.category?.name ?? null,
    }));

    if (suggestions.length === 0) {
      return {
        reply:
          'İsteğinize tam uyan bir ürün bulamadım. Bütçenizi veya damak zevkinizi biraz daha genişletebilirsiniz.',
        suggestions: [],
      };
    }

    const suggestionText = suggestions
      .map(
        (item) =>
          `${item.name} (${item.price.toLocaleString('tr-TR')} ₺)`,
      )
      .join(', ');

    return {
      reply: `Size ${suggestionText} seçeneklerini önerebilirim.`,
      suggestions,
    };
  }
}