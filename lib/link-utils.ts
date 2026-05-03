type InternalLinkProps = {
  rel: "follow";
};

type ExternalLinkProps = {
  rel: "nofollow noopener noreferrer";
  target: "_blank";
};

export function isExternalHref(href: string | null | undefined) {
  const value = String(href ?? "").trim().toLowerCase();
  return value.startsWith("http://") || value.startsWith("https://");
}

export function getInternalLinkProps(): InternalLinkProps {
  return {
    rel: "follow",
  };
}

export function getExternalLinkProps(): ExternalLinkProps {
  return {
    rel: "nofollow noopener noreferrer",
    target: "_blank",
  };
}

