import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginUserDto } from '../users/dto/login-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginUserDto: LoginUserDto) {
    const user = await this.usersService.findByEmail(
      loginUserDto.email,
    );

    if (!user) {
      throw new UnauthorizedException(
        'E-posta veya şifre hatalı.',
      );
    }

    if (user.password !== loginUserDto.password) {
      throw new UnauthorizedException(
        'E-posta veya şifre hatalı.',
      );
    }

    const restaurant = user.restaurants[0];

    if (!restaurant) {
      throw new UnauthorizedException(
        'Bu kullanıcıya bağlı bir restoran bulunamadı.',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      restaurantId: restaurant.id,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        city: restaurant.city,
        address: restaurant.address,
        phone: restaurant.phone,
      },
    };
  }
}