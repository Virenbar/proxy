interface Config {
    whitelist: string[]
    mirror: Record<string, string>
}

interface MirrorParams {
    key: string;
}

interface CORSQuery {
    url: string
}
