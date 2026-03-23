package com.back.report.service;

import com.back.global.exception.ServiceException;
import com.back.report.dto.ReportCreateRequest;
import com.back.report.entity.Report;
import com.back.report.entity.ReportReason;
import com.back.report.entity.TargetType;
import com.back.report.repository.ReportRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private ReportRepository reportRepository;

    @InjectMocks
    private ReportService reportService;

    @Test
    @DisplayName("신고가 정상적으로 접수된다.")
    void createReport_success() {
        Long reporterId = 1L;

        ReportCreateRequest request = new ReportCreateRequest(10L, TargetType.POST, ReportReason.PROFANITY, "욕설 신고");
        
        given(reportRepository.existsByReporterIdAndTargetIdAndTargetType(any(), any(), any())).willReturn(false);

        Report savedReport = Report.builder().build();

        ReflectionTestUtils.setField(savedReport, "id", 1L);

        given(reportRepository.save(any(Report.class))).willReturn(savedReport);


        Long resultId = reportService.createReport(reporterId, request);


        assertThat(resultId).isEqualTo(1L);
        verify(reportRepository).save(any(Report.class));
    }

    @Test
    @DisplayName("이미 신고한 콘텐츠라면 ServiceException(400-1)이 발생한다.")
    void createReport_fail_duplicate() {

        Long reporterId = 1L;
        ReportCreateRequest request = new ReportCreateRequest(10L, TargetType.POST, ReportReason.PROFANITY, "욕설 신고");
        
        given(reportRepository.existsByReporterIdAndTargetIdAndTargetType(reporterId, 10L, TargetType.POST))
                .willReturn(true);

        assertThatThrownBy(() -> reportService.createReport(reporterId, request))
                .isInstanceOf(ServiceException.class)
                .hasMessageContaining("400-1");
    }
}