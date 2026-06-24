import { Hono } from 'hono'
import { PageQueryDto } from '../../dto/query.dto.js'
import Guard from '../../middleware/auth.validator.js'
import Validate from '../../middleware/req.validator.js'
import { RepositoryFullTextSearch } from './full-text-search.svc.js'

const router = new Hono()
const ftsRepository = new RepositoryFullTextSearch()

router.get('/fts/search', Validate.for(PageQueryDto, 'query'), Guard.validate(), async (c) => {
    const value = await ftsRepository.search(c)
    return c.json(value)
})

router.get('/fts/query-like', Validate.for(PageQueryDto, 'query'), Guard.validate(), async (c) => {
    const value = await ftsRepository.queryLike(c)
    return c.json(value)
})

router.get('/fts/suggest', Validate.for(PageQueryDto, 'query'), Guard.validate(), async (c) => {
    const value = await ftsRepository.suggest(c)
    return c.json(value)
})


export default router