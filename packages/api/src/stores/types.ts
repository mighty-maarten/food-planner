import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../common/transforms.js';

/** The code types the app can show: the usual 1D barcodes of loyalty cards, and QR */
export const StoreCardFormat = {
    QR: 'qr',
    EAN13: 'ean13',
    EAN8: 'ean8',
    UPCA: 'upca',
    CODE128: 'code128',
    CODE39: 'code39',
    ITF: 'itf',
    CODABAR: 'codabar',
} as const;

export type StoreCardFormat = (typeof StoreCardFormat)[keyof typeof StoreCardFormat];

const FORMATS = Object.values(StoreCardFormat);

/** Digits-only formats and their lengths (with or without the check digit) */
const DIGITS: Partial<Record<StoreCardFormat, RegExp>> = {
    ean13: /^\d{12,13}$/,
    ean8: /^\d{7,8}$/,
    upca: /^\d{11,12}$/,
    itf: /^(\d\d)+$/,
};

/** Null when the code fits the format, else why not */
export function cardCodeError(code: string, format: StoreCardFormat): string | null {
    const pattern = DIGITS[format];
    return pattern && !pattern.test(code) ? `'${code}' is not a valid ${format} code` : null;
}

export class StoreCard {
    @ApiProperty({ description: 'The number or text in the code.' })
    public code!: string;
    @ApiProperty({ enum: FORMATS, enumName: 'StoreCardFormat' })
    public format!: StoreCardFormat;
}

export class Store {
    @ApiProperty()
    public id: string;
    @ApiProperty()
    public name: string;
    @ApiProperty({
        type: [String],
        description:
            'Every category id in the order of the route through this store. Categories without ' +
            'a position in this store follow in their default order.',
    })
    public categoryIds: string[];
    @ApiProperty({ type: StoreCard, nullable: true, description: "The household's loyalty card." })
    public card: StoreCard | null;

    constructor(
        store: { id: string; name: string; cardCode: string | null; cardFormat: string | null },
        categoryIds: string[],
    ) {
        this.id = store.id;
        this.name = store.name;
        this.categoryIds = categoryIds;
        this.card =
            store.cardCode && store.cardFormat
                ? { code: store.cardCode, format: store.cardFormat as StoreCardFormat }
                : null;
    }
}

export class StoreRequest {
    @ApiProperty()
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    public name!: string;
}

export class StoreCardRequest {
    @ApiProperty({ description: 'The number or text in the code.' })
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    public code!: string;

    @ApiProperty({ enum: FORMATS, enumName: 'StoreCardFormat' })
    @IsIn(FORMATS)
    public format!: StoreCardFormat;
}
