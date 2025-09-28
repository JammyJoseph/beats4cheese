export default function ItemPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Item {params.id}</h1>
    </div>
  )
}
