## first console
item-process ====>  {
  parts: [ 'john_doe', 'router' ],
  fileName: 'index.ts',
  segments: [ 'john_doe', 'router' ]
}
workdir ========> john_doe
relativePath ========> [ 'john_doe/router/index.ts' ]
itempath media ======>  [
  {
    file: File {
      size: 8275,
      type: 'application/octet-stream',
      name: 'router/index.ts',
      lastModified: 1779618959884
    },
    segments: [ 'john_doe', 'router' ],
    fileName: 'index.ts',
    ftpPath: 'john_doe/router'
  }
]

## seconds console
item-process ====>  {
  parts: [ 'john_doe', 'router', 'types' ],
  fileName: 'table.ts',
  segments: [ 'john_doe', 'router', 'types' ]
}
workdir ========> john_doe//router
relativePath ========> [ 'john_doe//router/types/table.ts' ]
itempath media ======>  [
  {
    file: File {
      size: 156,
      type: 'application/octet-stream',
      name: 'types/table.ts',
      lastModified: 1779619026617
    },
    segments: [ 'john_doe', 'router', 'types' ],
    fileName: 'table.ts',
    ftpPath: 'john_doe/router/types'
  }
]