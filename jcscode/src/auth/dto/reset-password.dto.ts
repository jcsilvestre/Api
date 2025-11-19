import { IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsString() token!: string;
  @IsString() @Length(8, 255) new_password!: string;
}
