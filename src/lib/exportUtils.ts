import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ClassRecord, Level, calculateGrade } from '../types';

export function exportToExcel(currentRecord: ClassRecord, currentLevel: Level, resultMode: 'full' | 'midterm' | 'final' = 'full') {
  const data = generateExportData(currentRecord, currentLevel, resultMode);
  
  const ws = utils.json_to_sheet([]);
  
  const modeLabel = resultMode === 'midterm' ? 'Mid-Term Results' : (resultMode === 'final' ? 'Final Test Results' : 'Full Term Results (Mid + Final)');

  // Add 5 blank rows at the very top for custom logos/headers
  utils.sheet_add_aoa(ws, [
    [], [], [], [], [], // 5 empty rows for custom logo space
    [`DEVELOPING POTENTIAL FOR SUCCESS - GRADE BOOK SUMMARY`],
    [`Class: ${currentRecord.className}`],
    [`Term: ${currentRecord.termName}  |  Teacher: ${currentRecord.teacherName}  |  Level: ${currentLevel.name}`],
    [`Report Period: ${modeLabel}`],
    []
  ], { origin: "A1" });

  utils.sheet_add_json(ws, data, { origin: "A11", skipHeader: false });
  
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

  const fileSuffix = resultMode === 'midterm' ? 'Midterm' : (resultMode === 'final' ? 'Final_Test' : 'Full_Term');
  writeFile(wb, `${currentRecord.className}_${currentRecord.termName}_${fileSuffix}_Summary.xlsx`.replace(/\s+/g, '_'));
}

export function exportToPDF(currentRecord: ClassRecord, currentLevel: Level, resultMode: 'full' | 'midterm' | 'final' = 'full') {
  const doc = new jsPDF('landscape');
  const data = generateExportData(currentRecord, currentLevel, resultMode);
  
  const modeLabel = resultMode === 'midterm' ? 'Mid-Term Results' : (resultMode === 'final' ? 'Final Test Results' : 'Full Term Results (Mid + Final)');

  // Leave top 28mm blank for logo positioning, start title at Y=34
  doc.setFontSize(16);
  doc.text(`DEVELOPING POTENTIAL FOR SUCCESS - GRADE BOOK SUMMARY`, 14, 34);
  doc.setFontSize(10);
  doc.text(`Class: ${currentRecord.className} | Term: ${currentRecord.termName} | Teacher: ${currentRecord.teacherName} | Level: ${currentLevel.name} | Period: ${modeLabel}`, 14, 42);

  const headers = Object.keys(data[0] || {});
  const rows = data.map(row => headers.map(h => row[h as keyof typeof row]));

  // @ts-ignore
  doc.autoTable({
    startY: 48,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8, cellPadding: 2.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // @ts-ignore
  const finalY = doc.lastAutoTable.finalY || 40;
  const footerY = finalY + 12;
  
  doc.setFontSize(8);
  doc.text("Abbreviations:", 14, footerY);
  doc.text("Alphabet Dict.: Alphabet Dictation", 14, footerY + 4);
  doc.text("Alphabet Recogn.: Alphabet Recognition", 14, footerY + 8);
  doc.text("Alphabet Writ.: Alphabet Writing", 14, footerY + 12);
  doc.text("Alphabet and W. Trac.: Alphabet and Word Tracing", 14, footerY + 16);
  doc.text("Individual Speak.: Individual Speaking", 14, footerY + 20);
  doc.text("Pair Conver.: Pair Conversation", 14, footerY + 24);

  const rightX = 220; 
  const today = new Date();
  const dateStr = `Date: Phnom Penh, ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  
  doc.text(dateStr, rightX, footerY);
  doc.text("Academic Manager", rightX, footerY + 4);
  doc.text("Sek Sokha", rightX, footerY + 20);

  const fileSuffix = resultMode === 'midterm' ? 'Midterm' : (resultMode === 'final' ? 'Final_Test' : 'Full_Term');
  doc.save(`${currentRecord.className}_${currentRecord.termName}_${fileSuffix}_Summary.pdf`.replace(/\s+/g, '_'));
}

function generateExportData(currentRecord: ClassRecord, currentLevel: Level, resultMode: 'full' | 'midterm' | 'final') {
  // Pre-calculate final scores and ranks
  const scores = currentRecord.students.map(student => {
    let weightedSubjectSum = 0;
    let totalSubjectWeight = 0;
    const subjectAvgs: Record<string, string> = {};
    
    currentLevel.subjects.forEach(subject => {
      let subjectPointsEarned = 0;
      let subjectCatWeightSum = 0;
      
      const activeCategories = subject.categories.filter(category => {
        const isFinal = category.name.toLowerCase().includes('final');
        if (resultMode === 'midterm') return !isFinal;
        if (resultMode === 'final') return isFinal;
        return true;
      });

      activeCategories.forEach(category => {
        let categoryEarned = 0;
        let categoryMax = 0;
        for (let i = 0; i < category.itemCount; i++) {
          const score = student.scores[`${category.id}_${i}`];
          if (typeof score === 'number') {
            categoryEarned += score;
            categoryMax += (category.itemMaxScores?.[i] || 100);
          }
        }
        const categoryPercentage = categoryMax > 0 ? (categoryEarned / categoryMax) : 0;
        subjectPointsEarned += categoryPercentage * category.weight;
        subjectCatWeightSum += category.weight;
      });
      
      const subjectScorePercentage = subjectCatWeightSum > 0 ? (subjectPointsEarned / subjectCatWeightSum) * 100 : 0;
      
      const subjectTargetWeight = subject.targetWeight !== undefined && subject.targetWeight > 0 
        ? subject.targetWeight 
        : (subject.categories.reduce((sum, c) => sum + c.weight, 0) || 100);
        
      weightedSubjectSum += (subjectScorePercentage * subjectTargetWeight);
      totalSubjectWeight += subjectTargetWeight;
      
      subjectAvgs[subject.name] = subjectScorePercentage.toFixed(1) + '%';
    });
    
    const finalScore = totalSubjectWeight > 0 ? (weightedSubjectSum / totalSubjectWeight) : 0;
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

    row['Total Average'] = `${metrics.finalScore.toFixed(1)}%`;
    row['Rank'] = rank;
    row['Grade'] = grade;
    row['Status'] = status;
    row['Comment'] = comment;

    return row;
  });
}
