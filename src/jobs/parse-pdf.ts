import { inngest } from '../lib/inngest-client.js';
import { FileParserRepository, IQueueFile } from '../modules/file/parser.svc.js';

export const parsePdfJob = inngest.createFunction(
    {
        id: 'parse-pdf',
        name: 'Parse PDF File',
        retries: 3,
        triggers: [{ event: 'drive/pdf.parse.requested' }],
    },
    async ({ event, step, logger }) => {
        const file = event.data as IQueueFile;
        const repo = new FileParserRepository();

        // Step 1: FTP download + PDF parsing (Inngest checkpoints result before step 2)
        const parsed = await step.run('download-and-parse', () =>
            repo.downloadAndParse(file)
        );

        logger.info(`Parsed ${file.fileName}: ${parsed.totalChunks} chunks across ${parsed.totalPages} pages`);

        // Step 2: embed + intent detection + DB write (independently retried)
        await step.run('embed-and-store', () =>
            repo.embedAndStore(file.id, parsed)
        );
    }
);
