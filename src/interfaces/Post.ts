export default interface Post {
    id: number,
    created_at: string,
    created_by: string,
    filename: string,
    title: string,
    description: string
    language: string
    published: boolean
    published_on: string
}