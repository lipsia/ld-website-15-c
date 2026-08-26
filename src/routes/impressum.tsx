import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "#/components/ui/PagePlaceholder";
import { Seo } from "#/components/ui/Seo";
import { getPages } from "#/content/site";

function ImpressumPage() {
	const page = getPages().imprint;

	return (
		<>
			<Seo title={page.title} path="/impressum" />
			<PagePlaceholder eyebrow={page.eyebrow} title={page.title} />
		</>
	);
}

export const Route = createFileRoute("/impressum")({ component: ImpressumPage });
