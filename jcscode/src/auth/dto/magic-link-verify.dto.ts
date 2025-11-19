import { IsString } from 'class-validator';

export class MagicLinkVerifyDto {
  @IsString() token!: string;
}
