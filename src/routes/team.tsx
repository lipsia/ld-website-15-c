import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "#/components/ui/PagePlaceholder";
import { Seo } from "#/components/ui/Seo";
import { getPages } from "#/content/site";

function TeamPage() {
	const page = getPages().team;

	return (
		<>
			<Seo title={page.title} path="/team" />
			<PagePlaceholder eyebrow={page.eyebrow} title={page.title} />
		</>
	);
}

export const Route = createFileRoute("/team")({ component: TeamPage });
