export default function HomePage() {
  return (
    <section className="container flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Travel Platform
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Project foundation initialized. Feature modules (destinations,
        recommendations, booking, trips) will be built on top of this base.
      </p>
    </section>
  );
}
