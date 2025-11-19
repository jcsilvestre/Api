import { IsEmail, IsString, Length } from 'class-validator';

export class SigninDto {
  @IsEmail() email!: string;
  @IsString() @Length(8, 255) password!: string;
}
