import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "#/components/ui/PagePlaceholder";
import { Seo } from "#/components/ui/Seo";
import { getPages } from "#/content/site";

function PrivacyPage() {
	const page = getPages().privacy;

	return (
		<>
			<Seo title={page.title} path="/datenschutz" />
			<PagePlaceholder eyebrow={page.eyebrow} title={page.title} />
		</>
	);
}

export const Route = createFileRoute("/datenschutz")({ component: PrivacyPage });
