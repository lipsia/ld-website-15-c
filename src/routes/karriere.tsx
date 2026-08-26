import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "#/components/ui/PagePlaceholder";
import { Seo } from "#/components/ui/Seo";
import { getPages } from "#/content/site";

function CareerPage() {
	const page = getPages().career;

	return (
		<>
			<Seo title={page.title} path="/karriere" />
			<PagePlaceholder eyebrow={page.eyebrow} title={page.title} />
		</>
	);
}

export const Route = createFileRoute("/karriere")({ component: CareerPage });
