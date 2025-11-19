import { IsString, Length } from 'class-validator';

export class RefreshDto {
  @IsString() @Length(10, 500) refreshToken!: string;
}
