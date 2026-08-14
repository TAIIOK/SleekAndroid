import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  findNodeHandle,
  StyleSheet,
  Text,
  TextInput,
  View,
  type View as ViewType,
} from 'react-native';

import { searchUsers, sendFriendInvite } from '@/api/friends';
import { FriendUserRow } from '@/components/friends/FriendUserRow';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

export function AddFriendPanel() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [sentIds, setSentIds] = useState<Record<string, true>>({});
  const [inputFocused, setInputFocused] = useState(false);
  const [searchBtnTag, setSearchBtnTag] = useState<number | undefined>();

  const bindSearchBtn = useCallback((node: ViewType | null) => {
    setSearchBtnTag(node ? (findNodeHandle(node) ?? undefined) : undefined);
  }, []);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['user-search', submitted],
    queryFn: () => searchUsers(submitted),
    enabled: submitted.trim().length >= 2,
  });

  const invite = useMutation({
    mutationFn: (friendId: string) => sendFriendInvite(friendId),
    onSuccess: (_data, friendId) => {
      setSentIds((prev) => ({ ...prev, [friendId]: true }));
      void queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });

  const tvNextFocus =
    isTvUi() && searchBtnTag != null
      ? ({ nextFocusRight: searchBtnTag, nextFocusDown: searchBtnTag } as Record<string, number>)
      : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Найти пользователя</Text>
      <Text style={styles.hint}>Введите никнейм, чтобы отправить заявку в друзья</Text>
      <View style={styles.searchSurface}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Никнейм"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            isTvUi() && styles.inputTv,
            isTvUi() && inputFocused && styles.inputFocused,
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          underlineColorAndroid="transparent"
          onSubmitEditing={() => setSubmitted(query.trim())}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          {...tvNextFocus}
        />
        <TvFocusable
          hostRef={bindSearchBtn}
          onPress={() => setSubmitted(query.trim())}
          style={styles.searchBtn}
        >
          <Text style={styles.searchLabel}>Найти</Text>
        </TvFocusable>
      </View>

      {isFetching ? (
        <ActivityIndicator color={colors.brand} style={styles.loader} />
      ) : null}

      {results.map((user) => {
        const sent = Boolean(sentIds[user.id]);
        return (
          <FriendUserRow
            key={user.id}
            userId={user.id}
            nickname={user.nickname}
            avatar={user.avatar}
            isOnline={user.isOnline}
            actions={
              <TvFocusable
                disabled={invite.isPending || sent}
                onPress={() => invite.mutate(user.id)}
                style={[styles.addBtn, sent && styles.addBtnSent]}
              >
                <Text style={[styles.addLabel, sent && styles.addLabelSent]}>
                  {sent ? 'Отправлено' : 'Добавить'}
                </Text>
              </TvFocusable>
            }
          />
        );
      })}

      {submitted.length >= 2 && !isFetching && results.length === 0 ? (
        <Text style={styles.empty}>Никого не найдено</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  searchSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
  inputTv: {
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  inputFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  searchBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.brandAccent,
  },
  searchLabel: { color: colors.text, fontWeight: '700', fontSize: 14 },
  loader: { marginTop: spacing.sm },
  addBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.brandAccent,
  },
  addBtnSent: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  addLabel: { color: colors.text, fontWeight: '600', fontSize: 13 },
  addLabelSent: { color: colors.textSecondary },
  empty: { color: colors.textMuted, fontSize: 13, paddingVertical: spacing.sm },
});
