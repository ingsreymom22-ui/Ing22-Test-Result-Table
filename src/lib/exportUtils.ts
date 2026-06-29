import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ClassRecord, Level, calculateGrade } from '../types';

export function exportToExcel(currentRecord: ClassRecord, currentLevel: Level) {
  const data = generateExportData(currentRecord, currentLevel);
  
  const ws = utils.json_to_sheet(data);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Grades");
  
  // Set column widths
  const colWidths = [{ wch: 5 }, { wch: 20 }, { wch: 15 }];
  currentLevel.subjects.forEach(() => colWidths.push({ wch: 15 }));
  colWidths.push({ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 });
  ws['!cols'] = colWidths;

  const today = new Date();
  const dateStr = `Date: Phnom Penh, ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const footerData = [
    [],
    ["Abbreviations:"],
    ["Alphabet Dict.: Alphabet Dictation", "", "", "", "", "", dateStr],
    ["Alphabet Recogn.: Alphabet Recognition", "", "", "", "", "", "Academic Manager"],
    ["Alphabet Writ.: Alphabet Writing"],
    ["Alphabet and W. Trac.: Alphabet and Word Tracing"],
    ["Individual Speak.: Individual Speaking"],
    ["Pair Conver.: Pair Conversation", "", "", "", "", "", "Sek Sokha"]
  ];

  utils.sheet_add_aoa(ws, footerData, { origin: -1 });

  writeFile(wb, `${currentRecord.className}_${currentRecord.termName}_Summary.xlsx`.replace(/\s+/g, '_'));
}

export function exportToPDF(currentRecord: ClassRecord, currentLevel: Level) {
  const doc = new jsPDF('landscape');
  const data = generateExportData(currentRecord, currentLevel);
  
  doc.setFontSize(18);
  doc.text(`Class: ${currentRecord.className}`, 14, 20);
  doc.setFontSize(12);
  doc.text(`Term: ${currentRecord.termName} | Teacher: ${currentRecord.teacherName} | Level: ${currentLevel.name}`, 14, 28);

  const headers = Object.keys(data[0] || {});
  const rows = data.map(row => headers.map(h => row[h as keyof typeof row]));

  // @ts-ignore
  doc.autoTable({
    startY: 35,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // @ts-ignore
  const finalY = doc.lastAutoTable.finalY || 40;
  const footerY = finalY + 15;
  
  doc.setFontSize(9);
  doc.text("Abbreviations:", 14, footerY);
  doc.text("Alphabet Dict.: Alphabet Dictation", 14, footerY + 5);
  doc.text("Alphabet Recogn.: Alphabet Recognition", 14, footerY + 10);
  doc.text("Alphabet Writ.: Alphabet Writing", 14, footerY + 15);
  doc.text("Alphabet and W. Trac.: Alphabet and Word Tracing", 14, footerY + 20);
  doc.text("Individual Speak.: Individual Speaking", 14, footerY + 25);
  doc.text("Pair Conver.: Pair Conversation", 14, footerY + 30);

  const rightX = 220; 
  const today = new Date();
  const dateStr = `Date: Phnom Penh, ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  
  doc.text(dateStr, rightX, footerY);
  doc.text("Academic Manager", rightX, footerY + 5);
  doc.text("Sek Sokha", rightX, footerY + 25);

  doc.save(`${currentRecord.className}_${currentRecord.termName}_Summary.pdf`.replace(/\s+/g, '_'));
}

function generateExportData(currentRecord: ClassRecord, currentLevel: Level) {
  // Pre-calculate final scores and ranks
  const scores = currentRecord.students.map(student => {
    let finalScore = 0;
    const subjectAvgs: Record<string, string> = {};
    
    currentLevel.subjects.forEach(subject => {
      let subjectScore = 0;
      subject.categories.forEach(category => {
        let categoryEarned = 0;
        let categoryMax = 0;
        for (let i = 0; i < category.itemCount; i++) {
          const score = student.scores[`${category.id}_${i}`];
          if (typeof score === 'number') {
            categoryEarned += score;
            categoryMax += (category.itemMaxScores?.[i] || 100);
          }
        }
        const categoryPercentage = categoryMax > 0 ? (categoryEarned / categoryMax) * 100 : 0;
        subjectScore += categoryPercentage * (category.weight / 100);
        finalScore += categoryPercentage * (category.weight / 100);
      });
      const subjectWeight = subject.categories.reduce((sum, c) => sum + c.weight, 0);
      subjectAvgs[subject.name] = subjectWeight > 0 ? ((subjectScore / subjectWeight) * 100).toFixed(2) + '%' : '0.00%';
    });
    return { id: student.id, finalScore, subjectAvgs };
  });

  const sortedScores = [...scores].sort((a, b) => b.finalScore - a.finalScore);
  
  return currentRecord.students.map((student, index) => {
    const metrics = scores.find(s => s.id === student.id)!;
    const rank = sortedScores.findIndex(s => s.finalScore === metrics.finalScore) + 1;
    let grade = calculateGrade(metrics.finalScore);
    let status = metrics.finalScore >= 70 ? 'Pass' : (metrics.finalScore < 50 ? 'Fail + Support 1 Month' : 'Fail');
    let comment = student.comment || '';

    const attVal = parseFloat(student.attendance || '100');
    if (!isNaN(attVal) && attVal < 70) {
      status = 'Auto-Fail';
      grade = 'F';
      comment = 'Auto-Fail';
    }

    const row: any = {
      '#': index + 1,
      'Student Name': student.name,
      'Attendance': student.attendance || '-',
    };

    currentLevel.subjects.forEach(subject => {
      row[`${subject.name} Avg`] = metrics.subjectAvgs[subject.name];
    });

    row['Total Average'] = `${metrics.finalScore.toFixed(2)}%`;
    row['Rank'] = rank;
    row['Grade'] = grade;
    row['Status'] = status;
    row['Comment'] = comment;

    return row;
  });
}
