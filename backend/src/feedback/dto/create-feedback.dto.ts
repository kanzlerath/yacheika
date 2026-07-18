import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsIn(['idea', 'bug', 'other'])
  kind: 'idea' | 'bug' | 'other';

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contact?: string;
}
