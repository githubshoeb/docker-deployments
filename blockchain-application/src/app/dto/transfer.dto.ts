import { ApiProperty } from '@nestjs/swagger';
import { DeployProcessedDto } from './install-return.dto';

export class TransferDto {
  @ApiProperty({ type: 'string', example: 'id_offer_test' })
  id_offer: string;

  @ApiProperty({ type: 'string', example: 'id_sponsor_test' })
  id_sponsor: string;

  @ApiProperty({ type: 'string', example: 'id_investor_test' })
  id_investor: string;

  @ApiProperty({
    type: 'string',
    example: '0x',
  })
  recipient_key: string;

  @ApiProperty({ type: 'string', example: '10' })
  amount: string;

  @ApiProperty({ type: DeployProcessedDto })
  deploy_processed: DeployProcessedDto;
}
