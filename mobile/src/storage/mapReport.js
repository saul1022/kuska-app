export function mapDbRowToReport(row) {
  return {
    id: row.client_id,
    title:
      row.title ||
      (row.description ? row.description.slice(0, 40) : 'Reporte sin descripción'),
    description: row.description || 'Sin descripción registrada.',
    date: new Date(row.created_at_client).toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
    location:
      row.lat != null && row.lon != null
        ? `${row.lat.toFixed(4)}, ${row.lon.toFixed(4)}`
        : 'Sin GPS',
    status: row.status,
    imageUrl: row.photo_uri,
    videoUri: row.video_uri,
  };
}
