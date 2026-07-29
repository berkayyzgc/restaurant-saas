import { DashboardService } from '../dashboard/dashboard.service';
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
  private readonly dashboardService: DashboardService,
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

const reports =
  await this.dashboardService.getReports(
    'today',
    undefined,
    undefined,
    restaurantId,
  );

  const comparison =
  await this.dashboardService.getComparisonReport(
    restaurantId,
  );

  const formatCurrency = (value: number) =>
  value.toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  });

const peakRevenueEntry =
  reports.revenueChart.length > 0
    ? reports.revenueChart.reduce(
        (highest, current) =>
          current.revenue > highest.revenue
            ? current
            : highest,
      )
    : null;

const topProductsText =
  reports.topSellingProducts.length > 0
    ? reports.topSellingProducts
        .map(
          (product, index) =>
            `${index + 1}. ${product.name}: ${product.quantity} adet, ${formatCurrency(product.revenue)} ciro`,
        )
        .join('\n')
    : 'Bugün satılan ürün verisi yok.';

const paymentMethodsText =
  reports.paymentMethods.length > 0
    ? reports.paymentMethods
        .map(
          (paymentMethod) =>
            `${paymentMethod.method}: ${paymentMethod.count} ödeme, ${formatCurrency(paymentMethod.amount)}, %${paymentMethod.percentage}`,
        )
        .join('\n')
    : 'Bugün tamamlanan ödeme yöntemi verisi yok.';

    const comparisonContext = `
DÜN İLE KARŞILAŞTIRMA

Dünkü ciro: ${formatCurrency(
  comparison.yesterday.totalRevenue,
)}

Bugünkü ciro: ${formatCurrency(
  comparison.today.totalRevenue,
)}

Ciro farkı: ${formatCurrency(
  comparison.comparison.revenueDifference,
)}

Yüzde değişim: %${
  comparison.comparison
    .revenueChangePercentage
}

Dünkü ödeme sayısı:
${comparison.yesterday.completedPayments}

Bugünkü ödeme sayısı:
${comparison.today.completedPayments}
`.trim();


const reportContext = `
BUGÜNKÜ GERÇEK RESTORAN VERİLERİ

Toplam ciro: ${formatCurrency(reports.totalRevenue)}
Tamamlanan ödeme sayısı: ${reports.completedPayments}
Ortalama ödeme: ${formatCurrency(reports.averagePaymentValue)}
En yoğun ciro saati: ${
  peakRevenueEntry && peakRevenueEntry.revenue > 0
    ? `${peakRevenueEntry.hour} — ${formatCurrency(peakRevenueEntry.revenue)}`
    : 'Henüz yeterli veri yok.'
}

En çok satan ürünler:
${topProductsText}

Ödeme yöntemleri:
${paymentMethodsText}
`.trim();

    try {
      const response =
        await this.openai.responses.create({
          model: 'gpt-5-mini',
          instructions: `
Sen Restaurant OS işletme asistanısın.

RESTORAN BİLGİLERİ
Restoran adı: ${restaurant.name}
Şehir: ${restaurant.city}
Açıklama: ${restaurant.description ?? 'Belirtilmemiş'}

${reportContext}
${comparisonContext}

KURALLAR
- Her zaman Türkçe cevap ver.
- Kısa, açık, profesyonel ve işletmeci odaklı ol.
- Yukarıdaki rakamlar restoranın gerçek bugünkü verileridir.
- Kullanıcı satış, ciro, ödeme, ürün veya yoğun saat sorarsa bu verileri kullan.
- Veri bulunmayan konularda tahmin üretme ve bilgi uydurma.
- Kampanya önerirken mevcut satış verilerine dayan ve uygulanabilir bir öneri sun.
- Para değerlerini Türk lirası biçiminde ifade et.
- Gereksiz uzun açıklamalardan kaçın.
- İşletmeci sana fikir danışıyorsa sadece mevcut durumu anlatma.
- Kullanıcı öneri istediğinde tam olarak 3 uygulanabilir öneri sun.
- Satış düşükse satış artıracak kampanyalar öner.
- Satış yüksekse kârı artıracak öneriler ver.
- En çok satan ürünlerden menü stratejisi oluştur.
- Az satan ürünler için kampanya veya menü düzeni öner.
- Yoğun saatlere göre personel planlaması öner.
- Gerektiğinde maliyet azaltma önerileri sun.
- İşletmeci gelecekle ilgili soru sorarsa mevcut verilere göre tahmini değil, senaryo bazlı öneriler üret.
- Restoran danışmanı gibi davran.
- Normal cevapları en fazla 6 kısa maddeyle sınırla.
- Kullanıcı ayrıntı istemedikçe cevabı 150 kelimeyi geçirme.
- Restoran verilerini her cevapta tekrar etme.
- Ciro, satış, ürün performansı veya ödeme bilgilerini sadece kullanıcı bunları sorarsa paylaş.
- Kullanıcı farklı bir konuda (kampanya, personel, pazarlama vb.) soru soruyorsa mevcut verileri arka planda analiz etmek için kullan ancak gereksiz istatistikleri cevapta yazma.
- Cevabın sonunda otomatik olarak özet, not veya satış rakamı ekleme.
- Sadece cevabı desteklemek için gerçekten gerekli olan verileri paylaş.
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