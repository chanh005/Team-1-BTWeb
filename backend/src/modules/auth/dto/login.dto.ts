import { IsEmail, IsString, MinLength } from "class-validator";
import { Transform } from "class-transformer";

export class LoginDto {
  @IsEmail({}, { message: "Please provide a valid email address" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  password!: string;
}
