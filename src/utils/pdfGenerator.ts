import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ReportData {
  type: string
  monthlyData?: any[]
  categoryData?: any[]
  topBooks?: any[]
  borrowData?: any[]
  overdueData?: any[]
  overdueBorrowings?: any[]
  totalBorrowings?: number
  totalOverdue?: number
  averageOverdueDays?: number
  totalCategories?: number
}

interface StatsData {
  totalBooks: number
  availableBooks: number
  totalBorrowings: number
  activeBorrowings: number
  returnedBorrowings: number
  overdueRate: string
  averagePerDay: string
  mostPopular: {
    title: string
    count: number
  } | null
}

export const generatePDF = (
  reportData: ReportData | null,
  statsData: StatsData,
  startDate: string,
  endDate: string,
  reportType: string,
  reportTitle?: string
) => {
  const doc = new jsPDF('p', 'mm', 'a4')
  
  // Set metadata
  doc.setProperties({
    title: 'Laporan Perpustakaan',
    subject: 'Laporan Statistik Perpustakaan',
    author: 'Sistem Perpustakaan Sekolah',
    keywords: 'laporan, perpustakaan, statistik, sekolah',
    creator: 'Sistem Perpustakaan Digital'
  })
  
  // Header dengan background biru
  doc.setFillColor(59, 130, 246) // Blue-600
  doc.rect(0, 0, 210, 25, 'F')
  
  // Judul laporan
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('LAPORAN PERPUSTAKAAN SEKOLAH', 105, 15, { align: 'center' })
  
  // Subjudul
  doc.setFontSize(10)
  doc.text('Sistem Manajemen Perpustakaan Digital', 105, 21, { align: 'center' })
  
  // Reset warna untuk konten
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  
  let yPos = 35
  
  // Informasi Laporan
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.5)
  doc.line(14, yPos - 5, 196, yPos - 5)
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('INFORMASI LAPORAN', 14, yPos)
  yPos += 7
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Jenis Laporan: ${getReportTypeName(reportType)}`, 14, yPos)
  yPos += 5
  doc.text(`Periode: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, yPos)
  yPos += 5
  doc.text(`Dibuat pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`, 14, yPos)
  yPos += 10
  
  // Statistik Utama
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('STATISTIK UTAMA', 14, yPos)
  yPos += 7
  
  const statsTable = [
    ['Total Buku', statsData.totalBooks.toString()],
    ['Buku Tersedia', statsData.availableBooks.toString()],
    ['Total Peminjaman', statsData.totalBorrowings.toString()],
    ['Peminjaman Aktif', statsData.activeBorrowings.toString()],
    ['Peminjaman Dikembalikan', statsData.returnedBorrowings.toString()],
    ['Tingkat Keterlambatan', statsData.overdueRate + '%'],
    ['Rata-rata Pinjam/Hari', statsData.averagePerDay],
  ]
  
  if (statsData.mostPopular) {
    statsTable.push(['Buku Paling Populer', `${statsData.mostPopular.title} (${statsData.mostPopular.count}x dipinjam)`])
  }
  
  autoTable(doc, {
    startY: yPos,
    head: [['METRIK', 'NILAI']],
    body: statsTable,
    theme: 'grid',
    headStyles: { 
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { cellWidth: 100 }
    },
    margin: { left: 14, right: 14 },
    styles: { cellPadding: 3 }
  })
  
  yPos = (doc as any).lastAutoTable.finalY + 15
  
  // Data Detail Berdasarkan Jenis Laporan
  if (reportData) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('DATA DETAIL LAPORAN', 14, yPos)
    yPos += 7
    
    switch (reportData.type) {
      case 'monthly':
        generateMonthlyReport(doc, reportData, yPos)
        break
        
      case 'popular':
        generatePopularBooksReport(doc, reportData, yPos)
        break
        
      case 'category':
        generateCategoryReport(doc, reportData, yPos)
        break
        
      case 'overdue':
        generateOverdueReport(doc, reportData, yPos)
        break
    }
  }
  
  // Footer pada setiap halaman
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    
    // Garis footer
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(14, 280, 196, 280)
    
    // Nomor halaman
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      105,
      285,
      { align: 'center' }
    )
    
    // Copyright
    doc.text(
      '© Sistem Perpustakaan Sekolah - Laporan ini dibuat secara otomatis',
      105,
      290,
      { align: 'center' }
    )
  }
  
  // Save PDF
  const fileName = `laporan-perpustakaan-${getReportTypeName(reportType).toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

// Helper functions
const getReportTypeName = (type: string): string => {
  switch (type) {
    case 'monthly': return 'Statistik Bulanan'
    case 'category': return 'Statistik Kategori'
    case 'popular': return 'Buku Paling Populer'
    case 'overdue': return 'Analisis Keterlambatan'
    default: return 'Laporan Umum'
  }
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// Monthly Report Generator
const generateMonthlyReport = (doc: jsPDF, reportData: any, startY: number) => {
  if (reportData.monthlyData && reportData.monthlyData.length > 0) {
    const monthlyTable = reportData.monthlyData.map((item: any) => [
      item.month,
      item.peminjaman.toString(),
      item.pengembalian.toString(),
      item.bukuBaru.toString()
    ])
    
    autoTable(doc, {
      startY: startY,
      head: [['BULAN', 'PEMINJAMAN', 'PENGEMBALIAN', 'BUKU BARU']],
      body: monthlyTable,
      theme: 'striped',
      headStyles: { 
        fillColor: [16, 185, 129], // Green-500
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { halign: 'center', cellWidth: 35 },
        2: { halign: 'center', cellWidth: 40 },
        3: { halign: 'center', cellWidth: 35 }
      },
      margin: { left: 14, right: 14 },
      styles: { cellPadding: 3 }
    })
    
    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Ringkasan:', 14, finalY)
    
    doc.setFont('helvetica', 'normal')
    const totalPeminjaman = reportData.monthlyData.reduce((sum: number, item: any) => sum + item.peminjaman, 0)
    const totalPengembalian = reportData.monthlyData.reduce((sum: number, item: any) => sum + item.pengembalian, 0)
    const totalBukuBaru = reportData.monthlyData.reduce((sum: number, item: any) => sum + item.bukuBaru, 0)
    
    doc.text(`• Total Peminjaman: ${totalPeminjaman}`, 20, finalY + 5)
    doc.text(`• Total Pengembalian: ${totalPengembalian}`, 20, finalY + 10)
    doc.text(`• Total Buku Baru: ${totalBukuBaru}`, 20, finalY + 15)
  } else {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.text('Tidak ada data statistik bulanan untuk periode ini.', 14, startY)
  }
}

// Popular Books Report Generator
const generatePopularBooksReport = (doc: jsPDF, reportData: any, startY: number) => {
  if (reportData.topBooks && reportData.topBooks.length > 0) {
    const booksTable = reportData.topBooks.map((book: any, index: number) => [
      (index + 1).toString(),
      truncateText(book.title, 40),
      book.author || '-',
      book.borrowCount.toString(),
      book.percentage.toFixed(1) + '%'
    ])
    
    autoTable(doc, {
      startY: startY,
      head: [['RANK', 'JUDUL BUKU', 'PENULIS', 'DIPINJAM', 'PERSENTASE']],
      body: booksTable,
      theme: 'grid',
      headStyles: { 
        fillColor: [139, 92, 246], // Purple-500
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 80 },
        2: { cellWidth: 45 },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: 14, right: 14 },
      styles: { cellPadding: 3 },
      pageBreak: 'auto'
    })
    
    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Ringkasan:', 14, finalY)
    
    doc.setFont('helvetica', 'normal')
    doc.text(`• Total buku yang dianalisis: ${reportData.topBooks.length} buku`, 20, finalY + 5)
    doc.text(`• Total peminjaman dalam periode: ${reportData.totalBorrowings || 0}`, 20, finalY + 10)
    doc.text(`• Buku paling populer: ${reportData.topBooks[0]?.title || '-'}`, 20, finalY + 15)
  } else {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.text('Tidak ada data buku populer untuk periode ini.', 14, startY)
  }
}

// Category Report Generator
const generateCategoryReport = (doc: jsPDF, reportData: any, startY: number) => {
  // Distribusi Kategori
  if (reportData.categoryData && reportData.categoryData.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Distribusi Kategori Buku:', 14, startY)
    
    const categoryTable = reportData.categoryData.map((item: any) => [
      item.name,
      item.value.toString()
    ])
    
    autoTable(doc, {
      startY: startY + 5,
      head: [['KATEGORI', 'JUMLAH BUKU']],
      body: categoryTable,
      theme: 'striped',
      headStyles: { 
        fillColor: [245, 158, 11], // Yellow-500
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { halign: 'center', cellWidth: 50 }
      },
      margin: { left: 14, right: 14 },
      styles: { cellPadding: 3 }
    })
    
    let nextY = (doc as any).lastAutoTable.finalY + 10
    
    // Peminjaman per Kategori
    if (reportData.borrowData && reportData.borrowData.length > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Peminjaman per Kategori:', 14, nextY)
      
      const borrowTable = reportData.borrowData.map((item: any) => [
        item.name,
        item.value.toString()
      ])
      
      autoTable(doc, {
        startY: nextY + 5,
        head: [['KATEGORI', 'JUMLAH PEMINJAMAN']],
        body: borrowTable,
        theme: 'grid',
        headStyles: { 
          fillColor: [59, 130, 246], // Blue-500
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { halign: 'center', cellWidth: 50 }
        },
        margin: { left: 14, right: 14 },
        styles: { cellPadding: 3 }
      })
      
      nextY = (doc as any).lastAutoTable.finalY + 10
    }
    
    // Summary
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Ringkasan:', 14, nextY)
    
    doc.setFont('helvetica', 'normal')
    doc.text(`• Total kategori: ${reportData.totalCategories || 0}`, 20, nextY + 5)
    doc.text(`• Kategori dengan buku terbanyak: ${reportData.categoryData[0]?.name || '-'}`, 20, nextY + 10)
  } else {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.text('Tidak ada data kategori untuk periode ini.', 14, startY)
  }
}

// Overdue Report Generator
const generateOverdueReport = (doc: jsPDF, reportData: any, startY: number) => {
  if (reportData.overdueData && reportData.overdueData.length > 0) {
    // Statistik Keterlambatan
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Statistik Keterlambatan:', 14, startY)
    
    const overdueTable = reportData.overdueData.map((item: any) => [
      item.month,
      item.count.toString()
    ])
    
    autoTable(doc, {
      startY: startY + 5,
      head: [['BULAN', 'JUMLAH KETERLAMBATAN']],
      body: overdueTable,
      theme: 'striped',
      headStyles: { 
        fillColor: [239, 68, 68], // Red-500
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { halign: 'center', cellWidth: 40 }
      },
      margin: { left: 14, right: 14 },
      styles: { cellPadding: 3 }
    })
    
    let nextY = (doc as any).lastAutoTable.finalY + 10
    
    // Detail Keterlambatan (10 pertama)
    if (reportData.overdueBorrowings && reportData.overdueBorrowings.length > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Detail Peminjaman Terlambat (10 Teratas):', 14, nextY)
      
      const overdueDetails = reportData.overdueBorrowings
        .slice(0, 10)
        .map((borrowing: any, index: number) => {
          const dueDate = new Date(borrowing.due_date)
          const today = new Date()
          const diffTime = today.getTime() - dueDate.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          
          return [
            (index + 1).toString(),
            truncateText(borrowing.borrower_name, 25),
            truncateText(borrowing.book?.title || '-', 35),
            dueDate.toLocaleDateString('id-ID'),
            diffDays.toString() + ' hari'
          ]
        })
      
      autoTable(doc, {
        startY: nextY + 5,
        head: [['NO', 'PEMINJAM', 'JUDUL BUKU', 'TANGGAL JATUH TEMPO', 'HARI TERLAMBAT']],
        body: overdueDetails,
        theme: 'grid',
        headStyles: { 
          fillColor: [100, 100, 100],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 40 },
          2: { cellWidth: 60 },
          3: { cellWidth: 40 },
          4: { cellWidth: 30, halign: 'center' }
        },
        margin: { left: 14, right: 14 },
        styles: { cellPadding: 2 },
        pageBreak: 'auto'
      })
      
      nextY = (doc as any).lastAutoTable.finalY + 10
    }
    
    // Summary
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Ringkasan:', 14, nextY)
    
    doc.setFont('helvetica', 'normal')
    doc.text(`• Total keterlambatan: ${reportData.totalOverdue || 0}`, 20, nextY + 5)
    doc.text(`• Rata-rata hari terlambat: ${reportData.averageOverdueDays || 0} hari`, 20, nextY + 10)
    doc.text(`• Tingkat keterlambatan: ${((reportData.totalOverdue || 0) / (reportData.totalBorrowings || 1) * 100).toFixed(1)}%`, 20, nextY + 15)
  } else {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.text('Tidak ada data keterlambatan untuk periode ini. Semua peminjaman tepat waktu!', 14, startY)
  }
}

// Helper function untuk memotong teks
const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '-'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

// Export to CSV/Excel
export const exportToCSV = (
  reportData: ReportData | null,
  statsData: StatsData,
  startDate: string,
  endDate: string,
  reportType: string
): void => {
  const data: string[][] = []
  
  // Header
  data.push(['LAPORAN PERPUSTAKAAN SEKOLAH'])
  data.push([])
  data.push(['INFORMASI LAPORAN'])
  data.push(['Jenis Laporan', getReportTypeName(reportType)])
  data.push(['Periode', `${formatDate(startDate)} - ${formatDate(endDate)}`])
  data.push(['Dibuat pada', new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID')])
  data.push([])
  
  // Statistik Utama
  data.push(['STATISTIK UTAMA'])
  data.push(['Metrik', 'Nilai'])
  data.push(['Total Buku', statsData.totalBooks.toString()])
  data.push(['Buku Tersedia', statsData.availableBooks.toString()])
  data.push(['Total Peminjaman', statsData.totalBorrowings.toString()])
  data.push(['Peminjaman Aktif', statsData.activeBorrowings.toString()])
  data.push(['Peminjaman Dikembalikan', statsData.returnedBorrowings.toString()])
  data.push(['Tingkat Keterlambatan', statsData.overdueRate + '%'])
  data.push(['Rata-rata Pinjam/Hari', statsData.averagePerDay])
  
  if (statsData.mostPopular) {
    data.push(['Buku Paling Populer', `${statsData.mostPopular.title} (${statsData.mostPopular.count}x dipinjam)`])
  }
  
  data.push([])
  
  // Data Detail
  if (reportData) {
    data.push(['DATA DETAIL LAPORAN'])
    
    switch (reportData.type) {
      case 'monthly':
        if (reportData.monthlyData && reportData.monthlyData.length > 0) {
          data.push(['STATISTIK BULANAN'])
          data.push(['Bulan', 'Peminjaman', 'Pengembalian', 'Buku Baru'])
          reportData.monthlyData.forEach((item: any) => {
            data.push([item.month, item.peminjaman, item.pengembalian, item.bukuBaru])
          })
        }
        break
        
      case 'popular':
        if (reportData.topBooks && reportData.topBooks.length > 0) {
          data.push(['BUKU PALING POPULER'])
          data.push(['Rank', 'Judul Buku', 'Penulis', 'Jumlah Dipinjam', 'Persentase'])
          reportData.topBooks.forEach((book: any, index: number) => {
            data.push([
              index + 1,
              book.title,
              book.author || '-',
              book.borrowCount,
              book.percentage.toFixed(1) + '%'
            ])
          })
        }
        break
    }
  }
  
  // Convert to CSV
  const csvContent = data.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  
  // Create and download file
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `laporan-perpustakaan-${getReportTypeName(reportType).toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  window.URL.revokeObjectURL(url)
}