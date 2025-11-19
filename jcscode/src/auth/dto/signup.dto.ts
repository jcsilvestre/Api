import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class SignupDto {
  @IsEmail() email!: string;
  @IsString() @Length(8, 255) password!: string;
  @IsOptional() @IsString() full_name?: string;
}
