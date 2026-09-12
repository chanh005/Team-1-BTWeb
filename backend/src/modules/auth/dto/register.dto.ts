import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: "Full name must be at least 2 characters" })
  @MaxLength(100)
  fullName!: string;

  @IsEmail({}, { message: "Please provide a valid email address" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @MaxLength(72) // bcrypt-family hashes silently truncate beyond 72 bytes
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: "Password must contain at least one letter and one number",
  })
  password!: string;

  @IsOptional()
  @IsPhoneNumber(undefined, {
    message: "Please provide a valid phone number, e.g. +14155551234",
  })
  phoneNumber?: string;
}
