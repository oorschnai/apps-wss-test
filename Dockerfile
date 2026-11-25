FROM denoland/deno:2.7.14

WORKDIR /app
COPY --chown=deno:deno deno.json main.ts ./
USER deno

ENV PORT=8000
EXPOSE 8000
CMD ["deno", "run", "--allow-net", "--allow-env=PORT", "main.ts"]
