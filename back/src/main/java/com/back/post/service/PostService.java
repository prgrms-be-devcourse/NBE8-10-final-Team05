package com.back.post.service;


import com.back.auth.application.AuthErrorCode;
import com.back.comment.repository.CommentRepository;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.post.application.PostErrorCode;
import com.back.post.dto.PostCreateReq;
import com.back.post.dto.PostInfoRes;
import com.back.post.dto.PostListRes;
import com.back.post.dto.PostUpdateReq;
import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;
import com.back.post.entity.PostResolutionStatus;
import com.back.post.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class PostService {
    private static final int SUMMARY_MAX_LENGTH = 100;

    private final PostRepository postRepository;
    private final MemberRepository memberRepository;
    private final CommentRepository commentRepository;

    /**
     * 인증된 회원을 작성자로 연결하여 게시글을 생성합니다.
     * <p>
     * 요청 본문에 포함된 제목, 내용, 썸네일, 카테고리 정보를 기반으로 게시글 엔티티를 생성하고,
     * 전달받은 회원 ID를 작성자로 연결한 뒤 저장합니다.
     *
     * @param req      게시글 생성 요청 객체
     * @param memberId 작성자 회원의 고유 식별자(ID)
     * @return 생성된 게시글의 고유 식별자(ID)
     */
    @Transactional
    public Long createPost(PostCreateReq req, Long memberId) {
        Member member = findMemberById(memberId);
        String summary = extractSummary(req.content());

        Post post = Post.builder()
                .title(req.title())
                .content(req.content())
                .summary(summary)
                .thumbnail(req.thumbnail())
                .member(member)
                .category(req.category())
                .build();

        post = postRepository.save(post);
        return post.getId();

    }

    /**
     * 제목과 카테고리 조건에 따라 게시글 목록을 Slice 형태로 조회합니다.
     *
     * <p>
     * {@link Slice} 방식을 사용하여 전체 게시글 개수(count)는 조회하지 않고,
     * 다음 페이지 존재 여부만 확인하여 반환합니다. 이는 무한 스크롤 또는
     * '더 보기' 형태의 UI에 적합합니다.
     * 제목, 카테고리, 제목+카테고리 조합에 따라 조회 조건을 분기합니다.
     *
     * @param title    제목 검색어
     * @param category 게시글 카테고리
     * @param pageable 페이징 및 정렬 정보
     * @return 검색 조건에 맞는 게시글 목록 Slice 응답 객체
     */
    @Transactional(readOnly = true)
    public Slice<PostListRes> getPosts(String title, PostCategory category, Pageable pageable) {
        Slice<Post> posts;
        boolean hasTitle = StringUtils.hasText(title);

        if (hasTitle && category != null) {
            posts = postRepository.findByTitleContainingAndCategory(title, category, pageable);
        } else if (hasTitle) {
            posts = postRepository.findByTitleContaining(title, pageable);
        } else if (category != null) {
            posts = postRepository.findByCategory(category, pageable);
        } else {
            posts = postRepository.findAllBy(pageable);
        }

        return posts.map(PostListRes::from);
    }


    /**
     * 게시글 단건을 조회합니다.
     *
     * <p>
     * 요청한 게시글 ID에 해당하는 게시글을 조회하고, 존재하지 않는 경우
     * 게시글 없음 예외를 발생시킵니다.
     *
     * @param id 조회할 게시글의 고유 식별자(ID)
     * @return 게시글 상세 응답 DTO
     */
    @Transactional(readOnly = true)
    public PostInfoRes getPost(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(PostErrorCode.POST_NOT_FOUND::toException);

        return PostInfoRes.from(post);
    }


    /**
     * 작성자 본인의 게시글 내용을 수정합니다.
     *
     * <p>
     * 게시글 존재 여부와 작성자 권한을 먼저 검증한 뒤,
     * 제목, 내용, 썸네일, 카테고리 정보를 새로운 값으로 갱신합니다.
     *
     * @param postId   수정할 게시글의 고유 식별자(ID)
     * @param req      게시글 수정 요청 객체
     * @param memberId 요청한 회원의 고유 식별자(ID)
     */
    @Transactional
    public void updatePost(Long postId, PostUpdateReq req, Long memberId) {
        Post post = findOwnedPost(postId, memberId);
        String summary = extractSummary(req.content());

        post.update(req.title(), req.content(), summary, req.thumbnail(), req.category());

    }

    /**
     * 작성자 본인의 게시글 고민 상태를 변경합니다.
     *
     * <p>
     * 게시글 존재 여부와 작성자 권한을 검증한 뒤,
     * 고민 상태를 고민중 또는 고민해결 상태로 갱신합니다.
     *
     * @param postId 수정할 게시글의 고유 식별자(ID)
     * @param resolutionStatus 변경할 고민 상태
     * @param memberId 요청한 회원의 고유 식별자(ID)
     */
    @Transactional
    public void updateResolutionStatus(
            Long postId,
            PostResolutionStatus resolutionStatus,
            Long memberId
    ) {
        Post post = findOwnedPost(postId, memberId);
        post.updateResolutionStatus(resolutionStatus);
    }

    /**
     * 작성자 본인의 게시글을 삭제합니다.
     *
     * <p>
     * 게시글 존재 여부와 작성자 권한을 검증한 뒤 게시글을 삭제합니다.
     *
     * @param postId   삭제할 게시글의 고유 식별자(ID)
     * @param memberId 요청한 회원의 고유 식별자(ID)
     */
    @Transactional
    public void deletePost(Long postId, Long memberId) {
        Post post = findOwnedPost(postId, memberId);

        // 게시글 삭제 전에 연결된 댓글을 먼저 삭제해 외래 키 제약을 방지한다.
        commentRepository.deleteByPostId(postId);
        postRepository.delete(post);
    }

    /**
     * 회원 ID로 작성자 엔티티를 조회합니다.
     *
     * <p>
     * 게시글 생성/수정/삭제 과정에서 사용될 회원 엔티티를 조회하며,
     * 존재하지 않는 경우 회원 없음 예외를 발생시킵니다.
     *
     * @param memberId 조회할 회원의 고유 식별자(ID)
     * @return 작성자 회원 엔티티
     */
    private Member findMemberById(Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(AuthErrorCode.MEMBER_NOT_FOUND::toException);
    }

    /**
     * 게시글 존재 여부와 작성자 본인 여부를 함께 검증한 뒤 게시글을 반환합니다.
     *
     * <p>
     * 게시글이 존재하지 않으면 게시글 없음 예외를 발생시키고,
     * 존재하더라도 요청한 회원이 작성자가 아니면 권한 없음 예외를 발생시킵니다.
     * 수정 및 삭제 기능에서 공통으로 사용하는 권한 검증 메서드입니다.
     *
     * @param postId   조회할 게시글의 고유 식별자(ID)
     * @param memberId 요청한 회원의 고유 식별자(ID)
     * @return 게시글 존재 및 작성자 권한 검증을 통과한 게시글 엔티티
     */
    private Post findOwnedPost(Long postId, Long memberId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(PostErrorCode.POST_NOT_FOUND::toException);

        if (post.getMember() == null || !post.getMember().getId().equals(memberId)) {
            throw PostErrorCode.FORBIDDEN.toException();
        }

        return post;
    }

    /**
     * 본문을 목록용 요약문으로 가공합니다.
     *
     * <p>
     * 줄바꿈과 연속 공백을 하나의 공백으로 정리한 뒤, 지정한 길이를 넘으면
     * 잘라서 말줄임표를 붙여 반환합니다.
     *
     * @param content 게시글 본문
     * @return 목록 화면에서 사용할 요약 문자열
     */
    private String extractSummary(String content) {
        String normalized = content.replaceAll("\\s+", " ").trim();

        if (normalized.length() <= SUMMARY_MAX_LENGTH) {
            return normalized;
        }

        return normalized.substring(0, SUMMARY_MAX_LENGTH) + "...";
    }


}
