import { IsIn, IsString, ValidateIf } from 'class-validator';

export type ReactionType = 'like' | 'not_my_place' | 'vibe_tag';

export class ReactVenueDto {
  @IsIn(['like', 'not_my_place', 'vibe_tag'])
  type: ReactionType;

  @ValidateIf((dto: ReactVenueDto) => dto.type === 'vibe_tag')
  @IsString()
  vibeTag?: string;
}
