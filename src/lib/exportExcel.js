// Genera un .xlsx real (no un .csv de texto) para que cada dato caiga en
// su propia celda sin depender de qué separador espera el Excel de cada
// quien (coma vs. punto y coma según el idioma/región de Windows).
//
// La librería (xlsx) se carga solo cuando alguien de verdad exporta algo,
// no en la carga inicial de la app — así no le suma peso a quien nunca usa
// esta función.
export async function exportExcel(nombreArchivo, encabezados, filas) {
  const XLSX = await import('xlsx')

  const datos = [encabezados, ...filas]
  const hoja = XLSX.utils.aoa_to_sheet(datos)

  hoja['!cols'] = encabezados.map((encabezado, i) => {
    const largoMax = Math.max(
      String(encabezado ?? '').length,
      ...filas.map((fila) => String(fila[i] ?? '').length),
      0,
    )
    return { wch: Math.min(Math.max(largoMax + 2, 10), 40) }
  })

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Datos')
  XLSX.writeFile(libro, nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`)
}
