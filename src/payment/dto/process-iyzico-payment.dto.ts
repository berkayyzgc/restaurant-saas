import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';

export class ProcessIyzicoPaymentDto {
  @IsInt()
  paymentId!: number;

  @IsString()
  @IsNotEmpty()
  cardHolderName!: string;

  @IsString()
  @Matches(/^\d{16}$/, {
    message: 'Kart numarası 16 rakam olmalıdır',
  })
  cardNumber!: string;

  @IsString()
  @Matches(/^(0[1-9]|1[0-2])$/, {
    message: 'Son kullanma ayı 01 ile 12 arasında olmalıdır',
  })
  expireMonth!: string;

  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'Son kullanma yılı 4 haneli olmalıdır',
  })
  expireYear!: string;

  @IsString()
  @Matches(/^\d{3,4}$/, {
    message: 'CVC 3 veya 4 rakam olmalıdır',
  })
  cvc!: string;
}