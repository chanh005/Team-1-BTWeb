import {
  IsDateString,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsPhoneNumber(undefined, {
    message: "Please provide a valid phone number, e.g. +14155551234",
  })
  phoneNumber?: string;

  @IsOptional()
  @IsUrl({}, { message: "avatarUrl must be a valid URL" })
  avatarUrl?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: "dateOfBirth must be a valid ISO date string" },
  )
  dateOfBirth?: string;
}
