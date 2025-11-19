import { IsOptional, IsEmail, IsString } from 'class-validator';

export class CheckAvailabilityDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() username?: string;
}
