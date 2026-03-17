import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from '../entities/admin.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
    private jwtService: JwtService,
  ) {}

  async validateAdmin(email: string, password: string): Promise<Admin> {
    const admin = await this.adminRepo.findOne({ where: { email } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return admin;
  }

  async login(email: string, password: string) {
    const admin = await this.validateAdmin(email, password);
    const payload = { sub: admin.id, email: admin.email };
    return { access_token: this.jwtService.sign(payload) };
  }
}
