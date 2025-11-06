import { ApiProperty } from '@nestjs/swagger';

export class ExecutionResultDto {
  @ApiProperty({
    type: 'object',
    properties: { cost: { type: 'string', example: '239904541655' } },
  })
  Success: { cost: string; };

  @ApiProperty({ required: false })
  Failure: { error_message: string; };
}

export class DeployProcessedDto {
  @ApiProperty({
    type: 'string',
    example: '0x',
  })
  deploy_hash: string;

  @ApiProperty({
    type: 'string',
    example: '0x',
  })
  account: string;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    example: '2024-03-12T16:22:07.000Z',
  })
  timestamp: string;

  @ApiProperty({ type: 'string', example: '30m' })
  ttl: string;

  @ApiProperty({ type: 'array', items: { type: 'string' }, example: [] })
  dependencies: string[];

  @ApiProperty({
    type: 'string',
    example: '0x',
  })
  block_hash: string;

  @ApiProperty({ type: ExecutionResultDto })
  execution_result: ExecutionResultDto;
}

export class InstallReturnDto {
  @ApiProperty({ type: 'string', example: 'id_offer_test' })
  id_offer: string;

  @ApiProperty({ type: 'string', example: 'id_sponsor_test' })
  id_sponsor: string;

  @ApiProperty({
    type: 'string',
    example: '0x',
  })
  sponsor_public_key: string;

  @ApiProperty({
    type: 'string',
    example: 'hash-0x',
  })
  contract_hash: string;

  @ApiProperty({ type: DeployProcessedDto })
  deploy_processed: DeployProcessedDto;
}
